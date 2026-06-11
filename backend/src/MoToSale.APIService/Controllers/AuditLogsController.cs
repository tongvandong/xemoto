using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Audit;
using MoToSale.Services.Audit;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = RoleConstant.Admin)]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogs;

    public AuditLogsController(IAuditLogService auditLogs)
    {
        _auditLogs = auditLogs;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] AuditLogSearchRequest request)
    {
        var result = await _auditLogs.SearchAsync(request);
        return Ok(result);
    }
}
