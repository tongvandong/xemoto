using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class Category : BaseEntity
{
    public int? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int Kind { get; set; } = (int)ProductKind.Motorcycle; // ProductKind
    public int SortOrder { get; set; }

    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
}
