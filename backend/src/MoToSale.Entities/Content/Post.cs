using MoToSale.Common;

namespace MoToSale.Entities.Content;

public class Post : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string Body { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public string? Category { get; set; }
    public string PostStatus { get; set; } = "Draft"; // Draft | Published
    public DateTime? PublishedAt { get; set; }
    public int? AuthorId { get; set; }
}
