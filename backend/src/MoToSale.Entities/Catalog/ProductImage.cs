using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class ProductImage : BaseEntity
{
    public int ProductId { get; set; }
    public int? SkuId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Alt { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }

    public Product Product { get; set; } = null!;
}
