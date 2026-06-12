using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;
using MoToSale.Services.Audit;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/advanced-operations")]
public class AdvancedOperationsController : ControllerBase
{
    private readonly IAdvancedOperationsService _service;
    private readonly IAuditLogService _auditLogs;

    public AdvancedOperationsController(IAdvancedOperationsService service, IAuditLogService auditLogs)
    {
        _service = service;
        _auditLogs = auditLogs;
    }

    private int? CurrentUserId
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

    private string? CurrentActorName
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

    private async Task AddAuditAsync(string entity, int id, string action, string? value = null)
    {
        await _auditLogs.AddAsync(entity, id.ToString(), action, value, CurrentUserId, CurrentActorName);
    }

    [HttpGet("returns")]
    public async Task<IActionResult> Returns([FromQuery] string? status)
    {
        List<SalesReturnDto> items = await _service.GetReturnsAsync(status);
        return Ok(new ItemsResponse<SalesReturnDto> { Items = items });
    }

    [HttpGet("returns/{id:int}")]
    public async Task<IActionResult> Return(int id)
    {
        var row = await _service.GetReturnAsync(id);

        if (row == null)
        {
            return NotFound();
        }

        return Ok(row);
    }

    [HttpPost("returns")]
    public async Task<IActionResult> CreateReturn(CreateSalesReturnRequest request)
    {
        try
        {
            int id = await _service.CreateReturnAsync(request, CurrentUserId);
            string auditValue = $"OrderId={request.OrderId};Lines={request.Lines.Count}";

            await AddAuditAsync("SalesReturn", id, "Create", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPut("returns/{id:int}")]
    public async Task<IActionResult> UpdateReturn(int id, UpdateSalesReturnRequest request)
    {
        try
        {
            await _service.UpdateReturnAsync(id, request, CurrentUserId);

            string auditValue = $"OrderId={request.OrderId};Lines={request.Lines.Count}";
            await AddAuditAsync("SalesReturn", id, "Update", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("returns/{id:int}/approve")]
    public async Task<IActionResult> ApproveReturn(int id, ApproveSalesReturnRequest request)
    {
        try
        {
            await _service.ApproveReturnAsync(id, request, CurrentUserId);

            string auditValue = $"RefundAmount={request.RefundAmount};Method={request.RefundMethod}";
            await AddAuditAsync("SalesReturn", id, "Approve", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("returns/{id:int}/reject")]
    public async Task<IActionResult> RejectReturn(int id, RejectSalesReturnRequest request)
    {
        try
        {
            await _service.RejectReturnAsync(id, request.Note, CurrentUserId);
            await AddAuditAsync("SalesReturn", id, "Reject", request.Note);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("refunds")]
    public async Task<IActionResult> Refunds([FromQuery] int? orderId)
    {
        List<RefundDto> items = await _service.GetRefundsAsync(orderId);
        return Ok(new ItemsResponse<RefundDto> { Items = items });
    }

    [HttpGet("receivables")]
    public async Task<IActionResult> Receivables()
    {
        List<OrderReceivableDto> items = await _service.GetReceivablesAsync();
        return Ok(new ItemsResponse<OrderReceivableDto> { Items = items });
    }

    [HttpGet("shifts")]
    public async Task<IActionResult> Shifts([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? staffUserId)
    {
        List<StaffShiftDto> items = await _service.GetShiftsAsync(from, to, staffUserId);
        return Ok(new ItemsResponse<StaffShiftDto> { Items = items });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPost("shifts")]
    public async Task<IActionResult> CreateShift(CreateStaffShiftRequest request)
    {
        try
        {
            int id = await _service.CreateShiftAsync(request, CurrentUserId);
            string auditValue = $"StaffUserId={request.StaffUserId}";

            await AddAuditAsync("StaffShift", id, "Create", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("shifts/{id:int}")]
    public async Task<IActionResult> UpdateShift(int id, UpdateStaffShiftRequest request)
    {
        try
        {
            await _service.UpdateShiftAsync(id, request);

            string auditValue = $"Status={request.ShiftStatus}";
            await AddAuditAsync("StaffShift", id, "Update", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("shifts/{id:int}")]
    public async Task<IActionResult> DeleteShift(int id)
    {
        try
        {
            await _service.DeleteShiftAsync(id);
            await AddAuditAsync("StaffShift", id, "Cancel");

            return Ok(new IdResponse { Id = id });
        }
        catch (AdvancedOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
