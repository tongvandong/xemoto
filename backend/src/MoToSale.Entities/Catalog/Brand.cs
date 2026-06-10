using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class Brand : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }

    public ICollection<VehicleModel> VehicleModels { get; set; } = new List<VehicleModel>();
}
