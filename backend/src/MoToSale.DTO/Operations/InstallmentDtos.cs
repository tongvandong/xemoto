namespace MoToSale.DTO.Operations;

// Hồ sơ đăng ký tư vấn trả góp (qua đối tác tài chính bên thứ 3).
public record CreateInstallmentApplicationRequest(
    int? ProductId, int? SkuId, string ProductName,
    string CustomerName, string CustomerPhone, string? CustomerEmail,
    string? FinancePartner, decimal DownPayment, int Months, string? Note);

// Admin duyệt hồ sơ -> tạo đơn bán (trả góp): chọn SKU/SL/giá và thu cọc/trả trước.
// FinancePartner được giữ để tương thích client cũ; luồng mới lấy đối tác từ hồ sơ khách đã gửi.
public record ApproveInstallmentApplicationRequest(
    int SkuId, int Qty, decimal? UnitPrice, decimal DownPayment,
    string PaymentMethod, string? FinancePartner, string? Note);

public record RejectInstallmentApplicationRequest(string? Note);

// Khách tự sửa hồ sơ trả góp của mình khi còn đang chờ duyệt (note dựng lại từ form phía client).
public record UpdateInstallmentApplicationRequest(
    string CustomerName, string CustomerPhone, string? CustomerEmail,
    string? FinancePartner, decimal DownPayment, int Months, string? Note);

// Kết quả duyệt hồ sơ trả góp: id hồ sơ + id đơn bán được tạo.
public class ApproveInstallmentApplicationResponse
{
    public int Id { get; set; }

    public int OrderId { get; set; }
}

public record InstallmentApplicationDto(
    int Id, string Code, int? CustomerId, string CustomerName, string CustomerPhone, string? CustomerEmail,
    int? ProductId, int? SkuId, string ProductSnapshot, string? FinancePartner, decimal DownPayment, int Months,
    string? Note, string ApplicationStatus, int? OrderId, string? OrderCode, DateTime CreatedDate, DateTime? HandledAt);
