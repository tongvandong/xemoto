using MoToSale.Common;

namespace MoToSale.Entities.Content;

public class ContactRequest : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public string Type { get; set; } = "General"; // General | Product | TestDrive | Consultation
    public int? ProductId { get; set; }
    public string ContactStatus { get; set; } = "New"; // New | Processed
    public DateTime? HandledAt { get; set; }
}
