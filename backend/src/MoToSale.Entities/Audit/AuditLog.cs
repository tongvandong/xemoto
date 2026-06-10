using MoToSale.Common;

namespace MoToSale.Entities.Audit;

public class AuditLog : BaseEntity
{
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public int? ActorId { get; set; }
    public string? ActorName { get; set; }
    public DateTime At { get; set; }
}
