using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

public class PartCompatibility : BaseEntity
{
    public int PartProductId { get; set; }
    public int? BrandId { get; set; }
    public int? VehicleModelId { get; set; }
    public short? YearFrom { get; set; }
    public short? YearTo { get; set; }
    public bool AppliesToAll { get; set; }
    public string? Note { get; set; }

    public Product PartProduct { get; set; } = null!;
}
