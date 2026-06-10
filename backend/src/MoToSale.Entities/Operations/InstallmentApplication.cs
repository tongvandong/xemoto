using MoToSale.Common;

namespace MoToSale.Entities.Operations;

/// <summary>
/// Hồ sơ đăng ký tư vấn trả góp (qua đối tác tài chính bên thứ 3).
/// Cửa hàng KHÔNG tự thu góp: khi duyệt sẽ tạo đơn bán thu đủ (khách trả trước + đối tác giải ngân).
/// Các trường số tháng / đối tác chỉ mang tính tham chiếu cho khâu tư vấn.
/// </summary>
public class InstallmentApplication : BaseEntity
{
    public string Code { get; set; } = string.Empty;

    public int? CustomerId { get; set; }          // nếu khách đã đăng nhập
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }

    public int? ProductId { get; set; }
    public int? SkuId { get; set; }
    public string ProductSnapshot { get; set; } = string.Empty; // tên sản phẩm quan tâm

    public string? FinancePartner { get; set; }   // đối tác tài chính mong muốn (Home Credit, FE Credit...)
    public decimal DownPayment { get; set; }       // tiền trả trước mong muốn (tham chiếu)
    public int Months { get; set; }                // số tháng mong muốn (tham chiếu)
    public string? Note { get; set; }

    public string ApplicationStatus { get; set; } = "Pending"; // Pending | Approved | Rejected
    public int? OrderId { get; set; }              // đơn bán tạo ra khi duyệt
    public int? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
}
