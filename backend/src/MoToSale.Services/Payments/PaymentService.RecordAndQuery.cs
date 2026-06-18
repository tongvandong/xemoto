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
    public async Task<int> RecordPaymentAsync(CreatePaymentRequest request, int? userId)
    {
        ValidateManualPaymentRequest(request);

        var order = await GetOrderOrThrowAsync(request.OrderId);
        EnsureOrderCanReceivePayment(order);

        var pendingPayment = await FindPendingPaymentAsync(order.Id);
        if (pendingPayment != null)
        {
            throw new PaymentException("Đơn đang có phiếu chuyển khoản chờ xác nhận. Hãy xác nhận hoặc hủy phiếu đó trước khi ghi nhận thanh toán thủ công.");
        }

        DateTime now = DateTime.UtcNow;
        string paymentStatusBefore = order.PaymentStatus;

        var payment = CreatePaidPayment(order.Id, request, userId, now);
        _payments.Add(payment);

        AddCashReceipt(order, request.Amount, request.Method, request.PaymentType, userId, now);

        decimal totalPaid = await _payments.GetTotalPaidAsync(order.Id) + request.Amount;
        if (totalPaid > order.GrandTotal)
        {
            throw new PaymentException("Tổng thanh toán vượt quá giá trị đơn.");
        }

        UpdateOrderAfterPaidAmount(order, totalPaid, now);
        AddPaymentStatusHistoryIfChanged(order, paymentStatusBefore, "Ghi nhận thanh toán", userId, now);
        await ConfirmReservationsIfEnoughPaidAsync(order, totalPaid, now);

        _orders.Update(order);
        await _payments.SaveChangesAsync();

        return payment.Id;
    }

    public Task<PagingResponse<PaymentListItem>> SearchAsync(PagingRequest request, string? status)
    {
        return _payments.SearchAsync(request, status);
    }
    public async Task<List<PaymentDto>> GetByOrderAsync(int orderId)
    {
        var payments = await _payments.GetByOrderAsync(orderId);
        var result = new List<PaymentDto>();

        foreach (var payment in payments)
        {
            result.Add(new PaymentDto(
                payment.Id,
                payment.Code,
                payment.OrderId,
                payment.PaymentType,
                payment.Amount,
                payment.Method,
                payment.PaymentRecordStatus,
                payment.TransactionRef,
                payment.PaidAt));
        }

        return result;
    }
    private static void ValidateManualPaymentRequest(CreatePaymentRequest request)
    {
        if (request.Amount <= 0)
        {
            throw new PaymentException("Số tiền phải lớn hơn 0.");
        }

        if (!IsManualPaymentMethod(request.Method))
        {
            throw new PaymentException("Phương thức thanh toán thủ công chỉ hỗ trợ tiền mặt hoặc chuyển khoản.");
        }
    }

    private static bool IsManualPaymentMethod(string? method)
    {
        return method == PaymentMethod.Cash || method == PaymentMethod.BankTransfer;
    }

    private async Task<Order> GetOrderOrThrowAsync(int orderId)
    {
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
        {
            throw new PaymentException("Không tìm thấy đơn hàng.");
        }

        return order;
    }

    private static void EnsureOrderCanReceivePayment(Order order)
    {
        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            throw new PaymentException("Đơn đã hủy.");
        }

        if (order.OrderType == OrderType.Installment)
        {
            throw new PaymentException("Đơn trả góp chỉ ghi nhận khoản trả trước khi duyệt hồ sơ. Phần còn lại do đối tác tài chính xử lý.");
        }
    }

    private async Task<Payment?> FindPendingPaymentAsync(int orderId)
    {
        var payments = await _payments.GetByOrderAsync(orderId);
        return payments.FirstOrDefault(payment => payment.PaymentRecordStatus == PaymentRecordStatus.Pending);
    }

    private static Payment CreatePaidPayment(int orderId, CreatePaymentRequest request, int? userId, DateTime now)
    {
        return new Payment
        {
            Code = $"TT{now:yyyyMMddHHmmssfff}",
            OrderId = orderId,
            PaymentType = request.PaymentType,
            Amount = request.Amount,
            Method = request.Method,
            PaymentRecordStatus = PaymentRecordStatus.Paid,
            TransactionRef = request.TransactionRef,
            Note = request.Note,
            RecordedBy = userId,
            PaidAt = now,
            CreatedDate = now,
        };
    }

    private static Payment CreatePendingTransferPayment(int orderId, string paymentType, decimal amount, int? userId, DateTime now)
    {
        return new Payment
        {
            Code = $"TT{now:yyyyMMddHHmmssfff}",
            OrderId = orderId,
            PaymentType = paymentType,
            Amount = amount,
            Method = PaymentMethod.BankTransfer,
            PaymentRecordStatus = PaymentRecordStatus.Pending,
            Note = "Khách báo đã chuyển khoản - chờ xác nhận",
            RecordedBy = userId,
            CreatedDate = now,
        };
    }
}
