using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoToSale.Common.Auth;
using MoToSale.Entities.Audit;
using MoToSale.Repository;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = RoleConstant.Admin)]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? entity = null, [FromQuery] string? action = null,
        [FromQuery] int? actorId = null, [FromQuery] string? keyword = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<AuditLog> query = _db.AuditLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(a => a.Entity == entity);
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
        if (actorId.HasValue) query = query.Where(a => a.ActorId == actorId);
        if (!string.IsNullOrWhiteSpace(keyword))
            query = query.Where(a => a.EntityId.Contains(keyword!)
                || (a.ActorName != null && a.ActorName.Contains(keyword!))
                || (a.NewValueJson != null && a.NewValueJson.Contains(keyword!)));
        if (from.HasValue) query = query.Where(a => a.At >= from.Value);
        if (to.HasValue) query = query.Where(a => a.At < to.Value.Date.AddDays(1));

        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(a => a.At).ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var items = rows.Select(a => new
        {
            id = a.Id,
            entity = a.Entity,
            entityId = a.EntityId,
            action = a.Action,
            oldValue = a.OldValueJson,
            newValue = a.NewValueJson,
            actorName = a.ActorName,
            actorId = a.ActorId,
            at = a.At,
        });

        return Ok(new { items, page, pageSize, totalItems = total, totalPages = (int)Math.Ceiling(total / (double)pageSize) });
    }
}
