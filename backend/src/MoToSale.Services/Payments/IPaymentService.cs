using MoToSale.DTO.Payments;

namespace MoToSale.Services.Payments;

public interface IPaymentService
{
    Task<int> RecordPaymentAsync(CreatePaymentRequest request, int? userId);
    Task<List<PaymentDto>> GetByOrderAsync(int orderId);
    Task<MoToSale.DTO.Common.PagingResponse<PaymentListItem>> SearchAsync(MoToSale.DTO.Common.PagingRequest request, string? status);
    Task CancelAsync(int id, string? reason);

    // Khách báo "đã chuyển khoản": tạo phiếu CHỜ XÁC NHẬN (chưa ghi quỹ, chưa đổi trạng thái thanh toán).
    Task<int> ClaimTransferAsync(int orderId, int? userId);
    // Admin/Staff xác nhận phiếu chuyển khoản đang chờ -> ghi nhận thu tiền + cập nhật đơn.
    Task ConfirmPaymentAsync(int paymentId, int? userId);
}

public class PaymentException : Exception
{
    public PaymentException(string message) : base(message) { }
}
