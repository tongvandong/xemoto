using MoToSale.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Payments;

public class PaymentService : IPaymentService
{
    private readonly IPaymentRepository _payments;
    private readonly IOrderRepository _orders;
    private readonly IReservationRepository _reservations;
    private readonly AppDbContext _db;

    public PaymentService(IPaymentRepository payments, IOrderRepository orders, IReservationRepository reservations, AppDbContext db)
    {
        _payments = payments;
        _orders = orders;
        _reservations = reservations;
        _db = db;
    }

    public async Task<int> RecordPaymentAsync(CreatePaymentRequest req, int? userId)
    {
        if (req.Amount <= 0) throw new PaymentException("Số tiền phải lớn hơn 0.");
        if (!IsManualPaymentMethod(req.Method))
            throw new PaymentException("Phương thức thanh toán thủ công chỉ hỗ trợ tiền mặt hoặc chuyển khoản.");
        var order = await _orders.GetByIdAsync(req.OrderId) ?? throw new PaymentException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new PaymentException("Đơn đã hủy.");
        var pendingPayment = (await _payments.GetByOrderAsync(order.Id))
            .FirstOrDefault(p => p.PaymentRecordStatus == PaymentRecordStatus.Pending);
        if (pendingPayment is not null)
            throw new PaymentException("Đơn đang có phiếu chuyển khoản chờ xác nhận. Hãy xác nhận hoặc hủy phiếu đó trước khi ghi nhận thanh toán thủ công.");

        var now = DateTime.UtcNow;
        var paymentStatusBefore = order.PaymentStatus;
        var payment = new Payment
        {
            Code = $"TT{now:yyyyMMddHHmmssfff}",
            OrderId = order.Id,
            PaymentType = req.PaymentType,
            Amount = req.Amount,
            Method = req.Method,
            PaymentRecordStatus = PaymentRecordStatus.Paid, // ghi nhận thủ công = đã thu
            TransactionRef = req.TransactionRef,
            Note = req.Note,
            RecordedBy = userId,
            PaidAt = now,
            CreatedDate = now,
        };
        _payments.Add(payment);

        // Ghi thu quỹ: dòng tiền vào khi thu tiền khách (đồng bộ sổ quỹ với phiếu thu).
        _db.CashTransactions.Add(new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Receipt", Category = "CustomerPayment",
            Amount = req.Amount, Method = req.Method, ReferenceType = "Payment", ReferenceId = order.Id,
            Note = $"Thu tiền đơn {order.Code} ({req.PaymentType})", RecordedBy = userId, OccurredAt = now, CreatedDate = now,
        });

        // Tổng đã thu (gồm phiếu vừa ghi).
        var totalPaid = await _payments.GetTotalPaidAsync(order.Id) + req.Amount;
        if (totalPaid > order.GrandTotal) throw new PaymentException("Tổng thanh toán vượt quá giá trị đơn.");

        order.RemainingAmount = Math.Max(0, order.GrandTotal - totalPaid);

        var reachedFull = totalPaid >= order.GrandTotal;
        var reachedDeposit = order.OrderType == Common.OrderType.Deposit && totalPaid >= order.DepositAmount;

        // Trục thanh toán: thu đủ -> Đã thanh toán; chưa đủ (kể cả đã đủ cọc) -> Chờ thanh toán.
        order.PaymentStatus = reachedFull ? Common.PaymentStatus.Paid : Common.PaymentStatus.Unpaid;
        if (order.PaymentStatus != paymentStatusBefore)
        {
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = order.Id, FromStatus = paymentStatusBefore, ToStatus = order.PaymentStatus,
                Note = "Ghi nhận thanh toán", ChangedBy = userId, CreatedDate = now,
            });
        }

        // Đủ tiền/đủ cọc → xác nhận giữ chỗ. KHÔNG đụng trạng thái đơn (admin tự duyệt giao).
        if (reachedFull || reachedDeposit)
        {
            foreach (var r in await _reservations.GetByOrderAsync(order.Id))
            {
                if (r.ReservationStatus == ReservationStatus.Active)
                {
                    r.ReservationStatus = ReservationStatus.Confirmed;
                    r.UpdatedDate = now;
                }
            }
        }

        order.UpdatedDate = now;
        _orders.Update(order);
        await _payments.SaveChangesAsync();
        return payment.Id;
    }

    private static bool IsManualPaymentMethod(string? method) =>
        method is PaymentMethod.Cash or PaymentMethod.BankTransfer;

    public Task<MoToSale.DTO.Common.PagingResponse<PaymentListItem>> SearchAsync(MoToSale.DTO.Common.PagingRequest request, string? status) => _payments.SearchAsync(request, status);

    public async Task CancelAsync(int id, string? reason)
    {
        var payment = await _payments.GetByIdAsync(id) ?? throw new PaymentException("Không tìm thấy phiếu thanh toán.");
        if (payment.PaymentRecordStatus == Common.PaymentRecordStatus.Cancelled) throw new PaymentException("Phiếu đã hủy.");

        var now = DateTime.UtcNow;
        payment.PaymentRecordStatus = Common.PaymentRecordStatus.Cancelled;
        payment.Note = string.IsNullOrWhiteSpace(reason) ? payment.Note : $"{payment.Note} | Hủy: {reason}";
        payment.UpdatedDate = now;
        _payments.Update(payment);

        // Đảo quỹ: dòng tiền ra để bù lại khoản thu đã hủy.
        _db.CashTransactions.Add(new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Payment", Category = "PaymentReversal",
            Amount = payment.Amount, Method = payment.Method, ReferenceType = "Payment", ReferenceId = payment.OrderId,
            Note = $"Đảo phiếu thu {payment.Code}", OccurredAt = now, CreatedDate = now,
        });

        // Tính lại trạng thái thanh toán đơn.
        var order = await _orders.GetByIdAsync(payment.OrderId);
        if (order is not null)
        {
            var paymentStatusBefore = order.PaymentStatus;
            var totalPaid = await _payments.GetTotalPaidAsync(order.Id) - payment.Amount;
            order.RemainingAmount = Math.Max(0, order.GrandTotal - totalPaid);
            order.PaymentStatus = totalPaid >= order.GrandTotal ? Common.PaymentStatus.Paid : Common.PaymentStatus.Unpaid;
            order.UpdatedDate = DateTime.UtcNow;
            _orders.Update(order);
            if (order.PaymentStatus != paymentStatusBefore)
            {
                _orders.AddStatusHistory(new OrderStatusHistory
                {
                    OrderId = order.Id, FromStatus = paymentStatusBefore, ToStatus = order.PaymentStatus,
                    Note = "Hủy ghi nhận thanh toán", CreatedDate = DateTime.UtcNow,
                });
            }
        }
        await _payments.SaveChangesAsync();
    }

    public async Task<int> ClaimTransferAsync(int orderId, int? userId)
    {
        var order = await _orders.GetByIdAsync(orderId) ?? throw new PaymentException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new PaymentException("Đơn đã hủy.");
        if (order.PaymentStatus == Common.PaymentStatus.Paid) throw new PaymentException("Đơn đã thanh toán đủ.");

        // Đơn cọc chưa trả gì -> khách chuyển khoản tiền cọc; còn lại -> chuyển phần còn thiếu.
        decimal amount;
        string payType;
        if (order.OrderType == Common.OrderType.Deposit && order.PaymentStatus == Common.PaymentStatus.Unpaid && order.DepositAmount > 0)
        {
            amount = order.DepositAmount; payType = PaymentRecordType.Deposit;
        }
        else
        {
            amount = order.RemainingAmount > 0 ? order.RemainingAmount : order.GrandTotal;
            payType = amount >= order.GrandTotal ? PaymentRecordType.Full : PaymentRecordType.Remaining;
        }
        if (amount <= 0) throw new PaymentException("Đơn không còn khoản cần thanh toán.");

        // Idempotent: đã có phiếu chờ xác nhận thì trả lại phiếu đó.
        var existing = (await _payments.GetByOrderAsync(orderId))
            .FirstOrDefault(p => p.PaymentRecordStatus == PaymentRecordStatus.Pending);
        if (existing is not null) return existing.Id;

        var now = DateTime.UtcNow;
        var payment = new Payment
        {
            Code = $"TT{now:yyyyMMddHHmmssfff}",
            OrderId = order.Id,
            PaymentType = payType,
            Amount = amount,
            Method = PaymentMethod.BankTransfer,
            PaymentRecordStatus = PaymentRecordStatus.Pending,
            Note = "Khách báo đã chuyển khoản — chờ xác nhận",
            RecordedBy = userId,
            CreatedDate = now,
        };
        _payments.Add(payment);

        // Trục thanh toán: đơn chuyển sang "Chờ xác nhận chuyển khoản" tới khi admin đối soát.
        if (order.PaymentStatus != Common.PaymentStatus.PendingConfirmation)
        {
            var payBefore = order.PaymentStatus;
            order.PaymentStatus = Common.PaymentStatus.PendingConfirmation;
            order.UpdatedDate = now;
            _orders.Update(order);
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = order.Id, FromStatus = payBefore, ToStatus = Common.PaymentStatus.PendingConfirmation,
                Note = "Khách báo đã chuyển khoản", ChangedBy = userId, CreatedDate = now,
            });
        }

        await _payments.SaveChangesAsync();
        return payment.Id;
    }

    public async Task ConfirmPaymentAsync(int paymentId, int? userId)
    {
        var payment = await _payments.GetByIdAsync(paymentId) ?? throw new PaymentException("Không tìm thấy phiếu thanh toán.");
        if (payment.PaymentRecordStatus != PaymentRecordStatus.Pending)
            throw new PaymentException("Phiếu không ở trạng thái chờ xác nhận.");
        var order = await _orders.GetByIdAsync(payment.OrderId) ?? throw new PaymentException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new PaymentException("Đơn đã hủy.");

        var now = DateTime.UtcNow;
        var paymentStatusBefore = order.PaymentStatus;

        payment.PaymentRecordStatus = PaymentRecordStatus.Paid;
        payment.PaidAt = now;
        payment.RecordedBy ??= userId;
        payment.UpdatedDate = now;
        _payments.Update(payment);

        // Ghi thu quỹ khi xác nhận chuyển khoản.
        _db.CashTransactions.Add(new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Receipt", Category = "CustomerPayment",
            Amount = payment.Amount, Method = payment.Method, ReferenceType = "Payment", ReferenceId = order.Id,
            Note = $"Xác nhận chuyển khoản đơn {order.Code}", RecordedBy = userId, OccurredAt = now, CreatedDate = now,
        });

        // Phiếu vẫn đang Pending trong DB nên cộng thêm Amount.
        var totalPaid = await _payments.GetTotalPaidAsync(order.Id) + payment.Amount;
        if (totalPaid > order.GrandTotal) totalPaid = order.GrandTotal;
        order.RemainingAmount = Math.Max(0, order.GrandTotal - totalPaid);

        var reachedFull = totalPaid >= order.GrandTotal;
        var reachedDeposit = order.OrderType == Common.OrderType.Deposit && totalPaid >= order.DepositAmount;
        // Thu đủ -> Đã thanh toán; chưa đủ (đã đối soát một phần/cọc) -> Chờ thanh toán.
        order.PaymentStatus = reachedFull ? Common.PaymentStatus.Paid : Common.PaymentStatus.Unpaid;
        if (order.PaymentStatus != paymentStatusBefore)
        {
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = order.Id, FromStatus = paymentStatusBefore, ToStatus = order.PaymentStatus,
                Note = "Xác nhận chuyển khoản", ChangedBy = userId, CreatedDate = now,
            });
        }

        // Đủ tiền/đủ cọc → xác nhận giữ chỗ. KHÔNG đụng trạng thái đơn.
        if (reachedFull || reachedDeposit)
        {
            foreach (var r in await _reservations.GetByOrderAsync(order.Id))
            {
                if (r.ReservationStatus == ReservationStatus.Active)
                {
                    r.ReservationStatus = ReservationStatus.Confirmed;
                    r.UpdatedDate = now;
                }
            }
        }

        order.UpdatedDate = now;
        _orders.Update(order);
        await _payments.SaveChangesAsync();
    }

    public async Task<List<PaymentDto>> GetByOrderAsync(int orderId)
    {
        var list = await _payments.GetByOrderAsync(orderId);
        return list.Select(p => new PaymentDto(
            p.Id, p.Code, p.OrderId, p.PaymentType, p.Amount, p.Method, p.PaymentRecordStatus, p.TransactionRef, p.PaidAt)).ToList();
    }
}
