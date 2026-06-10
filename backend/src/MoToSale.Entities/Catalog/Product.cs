using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class Product : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public int? BrandId { get; set; }
    public int? VehicleModelId { get; set; }
    public int? ManufacturerId { get; set; } // Hãng sản xuất phụ tùng (Michelin, Motul...)
    public int Kind { get; set; } = (int)ProductKind.Motorcycle; // ProductKind
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsHotDeal { get; set; }

    public Category Category { get; set; } = null!;
    public Brand? Brand { get; set; }
    public VehicleModel? VehicleModel { get; set; }
    public ICollection<Sku> Skus { get; set; } = new List<Sku>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}
