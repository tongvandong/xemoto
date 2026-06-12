using MoToSale.Common;

namespace MoToSale.Entities.SystemConfig;

public class Setting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string? Description { get; set; }
}
