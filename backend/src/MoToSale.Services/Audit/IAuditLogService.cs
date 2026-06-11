using MoToSale.DTO.Audit;
using MoToSale.DTO.Common;

namespace MoToSale.Services.Audit;

public interface IAuditLogService
{
    Task AddAsync(string entity, string entityId, string action, string? newValue, int? actorId, string? actorName);

    Task<PagingResponse<AuditLogDto>> SearchAsync(AuditLogSearchRequest request);
}
