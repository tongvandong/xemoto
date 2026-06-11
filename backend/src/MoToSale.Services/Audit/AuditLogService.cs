using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Audit;
using MoToSale.DTO.Common;
using MoToSale.Entities.Audit;
using MoToSale.Repository;

namespace MoToSale.Services.Audit;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(string entity, string entityId, string action, string? newValue, int? actorId, string? actorName)
    {
        DateTime now = DateTime.UtcNow;

        var auditLog = new AuditLog
        {
            Entity = entity,
            EntityId = entityId,
            Action = action,
            NewValueJson = newValue,
            ActorId = actorId,
            ActorName = actorName,
            At = now,
            CreatedDate = now
        };

        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();
    }

    public async Task<PagingResponse<AuditLogDto>> SearchAsync(AuditLogSearchRequest request)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 100);

        IQueryable<AuditLog> query = _db.AuditLogs.AsNoTracking();

        query = ApplyFilters(query, request);

        int totalItems = await query.CountAsync();

        List<AuditLogDto> items = await query
            .OrderByDescending(audit => audit.At)
            .ThenByDescending(audit => audit.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(audit => new AuditLogDto(
                audit.Id,
                audit.Entity,
                audit.EntityId,
                audit.Action,
                audit.OldValueJson,
                audit.NewValueJson,
                audit.ActorName,
                audit.ActorId,
                audit.At))
            .ToListAsync();

        return new PagingResponse<AuditLogDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems
        };
    }

    private static IQueryable<AuditLog> ApplyFilters(IQueryable<AuditLog> query, AuditLogSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Entity))
        {
            query = query.Where(audit => audit.Entity == request.Entity);
        }

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            query = query.Where(audit => audit.Action == request.Action);
        }

        if (request.ActorId.HasValue)
        {
            int actorId = request.ActorId.Value;
            query = query.Where(audit => audit.ActorId == actorId);
        }

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword;
            query = query.Where(audit =>
                audit.EntityId.Contains(keyword)
                || (audit.ActorName != null && audit.ActorName.Contains(keyword))
                || (audit.NewValueJson != null && audit.NewValueJson.Contains(keyword)));
        }

        if (request.From.HasValue)
        {
            DateTime from = request.From.Value;
            query = query.Where(audit => audit.At >= from);
        }

        if (request.To.HasValue)
        {
            DateTime to = request.To.Value.Date.AddDays(1);
            query = query.Where(audit => audit.At < to);
        }

        return query;
    }
}
