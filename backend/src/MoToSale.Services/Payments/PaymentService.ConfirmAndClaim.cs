using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Payments;
public partial class PaymentService
{
    public async Task<int> ClaimTransferAsync(int orderId, int? userId)
    {
        var order = await GetOrderOrThrowAsync(orderId);
        EnsureOrderCanReceivePayment(order);

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            throw new PaymentException("Đơn đã thanh toán đủ.");
        }

        decimal totalPaid = await _payments.GetTotalPaidAsync(orderId);
        decimal amount = CalculateClaimAmount(order, totalPaid);
        if (amount <= 0)
        {
            throw new PaymentException("Đơn không còn khoản cần thanh toán.");
        }

        var existingPayment = await FindPendingPaymentAsync(orderId);
        if (existingPayment != null)
        {
            return existingPayment.Id;
        }

        DateTime now = DateTime.UtcNow;
        string paymentType = DetermineClaimPaymentType(order, amount, totalPaid);
        var payment = CreatePendingTransferPayment(order.Id, paymentType, amount, userId, now);
        _payments.Add(payment);

        MoveOrderToPendingConfirmation(order, userId, now);

        await _payments.SaveChangesAsync();
        return payment.Id;
    }

    public async Task ConfirmPaymentAsync(int paymentId, int? userId)
    {
        var payment = await _payments.GetByIdAsync(paymentId);
        if (payment == null)
        {
            throw new PaymentException("Không tìm thấy phiếu thanh toán.");
        }

        if (payment.PaymentRecordStatus != PaymentRecordStatus.Pending)
        {
            throw new PaymentException("Phiếu không ở trạng thái chờ xác nhận.");
        }

        var order = await GetOrderOrThrowAsync(payment.OrderId);
        EnsureOrderCanReceivePayment(order);

        DateTime now = DateTime.UtcNow;
        string paymentStatusBefore = order.PaymentStatus;

        payment.PaymentRecordStatus = PaymentRecordStatus.Paid;
        payment.PaidAt = now;
        if (payment.RecordedBy == null)
        {
            payment.RecordedBy = userId;
        }
        payment.UpdatedDate = now;
        _payments.Update(payment);

        AddCashReceipt(order, payment.Amount, payment.Method, payment.PaymentType, userId, now);

        decimal totalPaid = await _payments.GetTotalPaidAsync(order.Id) + payment.Amount;
        if (totalPaid > order.GrandTotal)
        {
            totalPaid = order.GrandTotal;
        }

        UpdateOrderAfterPaidAmount(order, totalPaid, now);
        AddPaymentStatusHistoryIfChanged(order, paymentStatusBefore, "Xác nhận chuyển khoản", userId, now);
        await ConfirmReservationsIfEnoughPaidAsync(order, totalPaid, now);

        _orders.Update(order);
        await _payments.SaveChangesAsync();
    }
    private void AddCashReceipt(Order order, decimal amount, string method, string paymentType, int? userId, DateTime now)
    {
        _db.CashTransactions.Add(new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}",
            TransactionType = "Receipt",
            Category = "CustomerPayment",
            Amount = amount,
            Method = method,
            ReferenceType = "Payment",
            ReferenceId = order.Id,
            Note = $"Thu tiền đơn {order.Code} ({paymentType})",
            RecordedBy = userId,
            OccurredAt = now,
            CreatedDate = now,
        });
    }
    private void UpdateOrderAfterPaidAmount(Order order, decimal totalPaid, DateTime now)
    {
        order.RemainingAmount = Math.Max(0, order.GrandTotal - totalPaid);

        if (totalPaid >= order.GrandTotal)
        {
            order.PaymentStatus = PaymentStatus.Paid;
        }
        else
        {
            order.PaymentStatus = PaymentStatus.Unpaid;
        }

        order.UpdatedDate = now;
    }
    private async Task ConfirmReservationsIfEnoughPaidAsync(Order order, decimal totalPaid, DateTime now)
    {
        bool reachedFullPayment = totalPaid >= order.GrandTotal;
        bool reachedDeposit = order.OrderType == OrderType.Deposit && totalPaid >= order.DepositAmount;

        if (!reachedFullPayment && !reachedDeposit)
        {
            return;
        }

        var reservations = await _reservations.GetByOrderAsync(order.Id);
        foreach (var reservation in reservations)
        {
            if (reservation.ReservationStatus != ReservationStatus.Active)
            {
                continue;
            }

            reservation.ReservationStatus = ReservationStatus.Confirmed;
            reservation.UpdatedDate = now;
        }
    }

    // Xác định khoản khách cần chuyển. Đơn đặt cọc: lần đầu (chưa thu đồng nào) chuyển TIỀN CỌC,
    // các lần sau chuyển phần còn lại. Dựa vào totalPaid thay vì PaymentStatus vì sau khi xác nhận
    // cọc, backend đưa PaymentStatus về Unpaid (chưa đủ 100%) — dễ tính nhầm lại thành tiền cọc.
    private static decimal CalculateClaimAmount(Order order, decimal totalPaid)
    {
        bool isFirstDepositPayment = order.OrderType == OrderType.Deposit
            && totalPaid <= 0
            && order.DepositAmount > 0;

        if (isFirstDepositPayment)
        {
            return order.DepositAmount;
        }

        if (order.RemainingAmount > 0)
        {
            return order.RemainingAmount;
        }

        return order.GrandTotal;
    }

    private static string DetermineClaimPaymentType(Order order, decimal amount, decimal totalPaid)
    {
        bool isFirstDepositPayment = order.OrderType == OrderType.Deposit
            && totalPaid <= 0
            && order.DepositAmount > 0;

        if (isFirstDepositPayment)
        {
            return PaymentRecordType.Deposit;
        }

        if (amount >= order.GrandTotal)
        {
            return PaymentRecordType.Full;
        }

        return PaymentRecordType.Remaining;
    }

    private void MoveOrderToPendingConfirmation(Order order, int? userId, DateTime now)
    {
        if (order.PaymentStatus == PaymentStatus.PendingConfirmation)
        {
            return;
        }

        string oldPaymentStatus = order.PaymentStatus;
        order.PaymentStatus = PaymentStatus.PendingConfirmation;
        order.UpdatedDate = now;
    }
}
