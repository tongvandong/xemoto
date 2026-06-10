using MoToSale.Common;

namespace MoToSale.Entities.Payments;

/// <summary>Phiếu thanh toán — ghi nhận thủ công bởi admin/staff (cọc/đủ/còn lại/trả góp).</summary>
public class Payment : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string PaymentType { get; set; } = PaymentRecordType.Full;
    public decimal Amount { get; set; }
    public string Method { get; set; } = PaymentMethod.Cash;
    public string PaymentRecordStatus { get; set; } = Common.PaymentRecordStatus.Paid;
    public string? TransactionRef { get; set; }
    public string? Note { get; set; }
    public int? RecordedBy { get; set; }
    public DateTime? PaidAt { get; set; }
}
