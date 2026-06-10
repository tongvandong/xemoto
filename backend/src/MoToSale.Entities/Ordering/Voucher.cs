using MoToSale.Common;

namespace MoToSale.Entities.Ordering;

public class Voucher : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = "Percent"; // Percent | Amount
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscount { get; set; }
    public decimal MinOrderValue { get; set; }
    public int? UsageLimit { get; set; }
    public int? PerUserLimit { get; set; }
    public int UsedCount { get; set; }
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
}

public class VoucherScope : BaseEntity
{
    public int VoucherId { get; set; }
    public string ScopeType { get; set; } = string.Empty; // Product | Category | Brand
    public int RefId { get; set; }

    public Voucher Voucher { get; set; } = null!;
}

public class VoucherRedemption : BaseEntity
{
    public int VoucherId { get; set; }
    public int UserId { get; set; }
    public int OrderId { get; set; }
    public decimal Amount { get; set; }
    public DateTime RedeemedAt { get; set; }

    public Voucher Voucher { get; set; } = null!;
}

public class OrderVoucher : BaseEntity
{
    public int OrderId { get; set; }
    public string VoucherCodeSnapshot { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
}
