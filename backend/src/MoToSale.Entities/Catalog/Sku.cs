using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class Sku : BaseEntity
{
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string? Color { get; set; }
    public string? Version { get; set; }
    public decimal ListPrice { get; set; }
    public decimal? SalePrice { get; set; }
    public string? Barcode { get; set; }

    public Product Product { get; set; } = null!;
}
