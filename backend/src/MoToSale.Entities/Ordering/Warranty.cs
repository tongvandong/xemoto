using MoToSale.Common;

namespace MoToSale.Entities.Ordering;

public class Warranty : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int? OrderId { get; set; }
    public int? OrderLineId { get; set; }
    public int? SkuId { get; set; }
    public int? CustomerId { get; set; }
    public string ProductSnapshot { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? FrameNumber { get; set; }
    public string? EngineNumber { get; set; }
    public string ReportedIssue { get; set; } = string.Empty;
    public decimal? EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime StartAt { get; set; }
    public int Months { get; set; }
    public string WarrantyStatus { get; set; } = "Active"; // Active | Expired | Void
    public string? Note { get; set; }
}
