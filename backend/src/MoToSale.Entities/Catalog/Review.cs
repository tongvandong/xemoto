using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class Review : BaseEntity
{
    public int ProductId { get; set; }
    public int UserId { get; set; }
    public int? OrderId { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }
    public string? ImageUrl { get; set; }
    public string ReviewStatus { get; set; } = "Pending"; // Pending | Approved | Rejected
}
