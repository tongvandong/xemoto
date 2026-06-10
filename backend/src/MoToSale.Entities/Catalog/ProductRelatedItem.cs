using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class ProductRelatedItem : BaseEntity
{
    public int ProductId { get; set; }
    public int RelatedProductId { get; set; }
    public string RelationType { get; set; } = "Accessory"; // Accessory | Bundle | Alternative
    public string? Note { get; set; }
    public int SortOrder { get; set; }

    public Product Product { get; set; } = null!;
    public Product RelatedProduct { get; set; } = null!;
}
