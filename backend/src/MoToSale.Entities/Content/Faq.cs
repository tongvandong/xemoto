using MoToSale.Common;

namespace MoToSale.Entities.Content;

public class Faq : BaseEntity
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int SortOrder { get; set; }
}
