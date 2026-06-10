using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class VehicleModel : BaseEntity
{
    public int BrandId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public Brand Brand { get; set; } = null!;
}
