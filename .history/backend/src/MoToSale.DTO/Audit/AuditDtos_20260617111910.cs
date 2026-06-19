using MoToSale.DTO.Common;

namespace MoToSale.DTO.Audit;

public class AuditLogSearchRequest : PagingRequest
{
    public string? Entity { get; set; }
    public string? Action { get; set; }
    public int? ActorId { get; set; }

    public DateTime? To { get; set; }
}

public record AuditLogDto(
    int Id,
    string Entity,
    string EntityId,
    string Action,
    string? OldValue,
    string? NewValue,
    string? ActorName,
    int? ActorId,
    DateTime At);
