using MoToSale.Common;

namespace MoToSale.Entities.Ordering;

public class WarrantyHistory : BaseEntity
{
    public int WarrantyId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Note { get; set; }
    public decimal? ActualCost { get; set; }
    public int? ChangedBy { get; set; }
}
