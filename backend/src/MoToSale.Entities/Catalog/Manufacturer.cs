using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

/// <summary>Hãng sản xuất phụ tùng (Michelin, Motul, GS...) — tách biệt với hãng xe (Brand).</summary>
public class Manufacturer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Description { get; set; }
}
