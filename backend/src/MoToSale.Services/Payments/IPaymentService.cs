using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;

namespace MoToSale.Services.Payments;

public interface IPaymentService
{
    Task<int> RecordPaymentAsync(CreatePaymentRequest request, int? userId);
    Task<List<PaymentDto>> GetByOrderAsync(int orderId);
    Task<PagingResponse<PaymentListItem>> SearchAsync(PagingRequest request, string? status);
    Task CancelAsync(int id, string? reason);

    // Khách báo đã chuyển khoản: tạo phiếu chờ xác nhận, chưa ghi quỹ.
    Task<int> ClaimTransferAsync(int orderId, int? userId);

    // Admin/staff xác nhận phiếu chuyển khoản: ghi thu tiền và cập nhật đơn.
    Task ConfirmPaymentAsync(int paymentId, int? userId);
}

public class PaymentException : Exception
{
    public PaymentException(string message) : base(message)
    {
    }
}
