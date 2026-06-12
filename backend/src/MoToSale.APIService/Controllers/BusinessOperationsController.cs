using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.Services.Audit;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/business-operations")]
public partial class BusinessOperationsController : ControllerBase
{
    private readonly IBusinessOperationsService _service;
    private readonly IAuditLogService _auditLogs;

    public BusinessOperationsController(IBusinessOperationsService service, IAuditLogService auditLogs)
    {
        _service = service;
        _auditLogs = auditLogs;
    }

    private int? UserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdText, out int userId))
            {
                return userId;
            }

            return null;
        }
    }

    private string? ActorName
    {
        get
        {
            string? name = User.FindFirstValue(ClaimTypes.Name);

            if (!string.IsNullOrWhiteSpace(name))
            {
                return name;
            }

            return User.FindFirstValue(ClaimTypes.Email);
        }
    }

    private async Task AddAuditAsync(string entity, string entityId, string action, string? newValue = null)
    {
        await _auditLogs.AddAsync(entity, entityId, action, newValue, UserId, ActorName);
    }

    private async Task<IActionResult> RunAsync(Func<Task> action)
    {
        try
        {
            await action();
            return Ok();
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    private async Task<IActionResult> CreateAsync(Func<Task<int>> action, Func<int, Task>? afterSuccess = null)
    {
        try
        {
            int id = await action();

            if (afterSuccess != null)
            {
                await afterSuccess(id);
            }

            return Ok(new IdResponse { Id = id });
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> Lookups()
    {
        var result = await _service.GetLookupsAsync();
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        bool isAdmin = User.IsInRole(RoleConstant.Admin);
        var result = await _service.GetSummaryAsync(isAdmin);
        return Ok(result);
    }
}
