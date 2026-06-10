namespace MoToSale.DTO.Operations;

// Hồ sơ đăng ký tư vấn trả góp (qua đối tác tài chính bên thứ 3).
public record CreateInstallmentApplicationRequest(
    int? ProductId, int? SkuId, string ProductName,
    string CustomerName, string CustomerPhone, string? CustomerEmail,
    string? FinancePartner, decimal DownPayment, int Months, string? Note);

// Admin duyệt hồ sơ -> tạo đơn bán (trả góp): chọn SKU/SL/giá, thu trả trước, chọn đối tác.
public record ApproveInstallmentApplicationRequest(
    int SkuId, int Qty, decimal? UnitPrice, decimal DownPayment,
    string PaymentMethod, string? FinancePartner, string? Note);

public record RejectInstallmentApplicationRequest(string? Note);

public record InstallmentApplicationDto(
    int Id, string Code, int? CustomerId, string CustomerName, string CustomerPhone, string? CustomerEmail,
    int? ProductId, int? SkuId, string ProductSnapshot, string? FinancePartner, decimal DownPayment, int Months,
    string? Note, string ApplicationStatus, int? OrderId, string? OrderCode, DateTime CreatedDate, DateTime? HandledAt);
