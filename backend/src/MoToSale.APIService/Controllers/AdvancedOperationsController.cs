using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Audit;
using MoToSale.Repository;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/advanced-operations")]
public class AdvancedOperationsController : ControllerBase
{
    private readonly IAdvancedOperationsService _service;
    private readonly AppDbContext _db;
    public AdvancedOperationsController(IAdvancedOperationsService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }
    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private async Task AddAuditAsync(string entity, int id, string action, string? value = null)
    {
        var now = DateTime.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            Entity = entity, EntityId = id.ToString(), Action = action, NewValueJson = value,
            ActorId = CurrentUserId, ActorName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            At = now, CreatedDate = now
        });
        await _db.SaveChangesAsync();
    }

    [HttpGet("returns")]
    public async Task<IActionResult> Returns([FromQuery] string? status) => Ok(new { items = await _service.GetReturnsAsync(status) });
    [HttpGet("returns/{id:int}")]
    public async Task<IActionResult> Return(int id) { var row = await _service.GetReturnAsync(id); return row is null ? NotFound() : Ok(row); }
    [HttpPost("returns")]
    public async Task<IActionResult> CreateReturn(CreateSalesReturnRequest request) { try { var id = await _service.CreateReturnAsync(request, CurrentUserId); await AddAuditAsync("SalesReturn", id, "Create", $"OrderId={request.OrderId};Lines={request.Lines.Count}"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
    [HttpPut("returns/{id:int}")]
    public async Task<IActionResult> UpdateReturn(int id, UpdateSalesReturnRequest request) { try { await _service.UpdateReturnAsync(id, request, CurrentUserId); await AddAuditAsync("SalesReturn", id, "Update", $"OrderId={request.OrderId};Lines={request.Lines.Count}"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
    [HttpPost("returns/{id:int}/approve")]
    public async Task<IActionResult> ApproveReturn(int id, ApproveSalesReturnRequest request) { try { await _service.ApproveReturnAsync(id, request, CurrentUserId); await AddAuditAsync("SalesReturn", id, "Approve", $"RefundAmount={request.RefundAmount};Method={request.RefundMethod}"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
    [HttpPost("returns/{id:int}/reject")]
    public async Task<IActionResult> RejectReturn(int id, RejectSalesReturnRequest request) { try { await _service.RejectReturnAsync(id, request.Note, CurrentUserId); await AddAuditAsync("SalesReturn", id, "Reject", request.Note); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }

    [HttpGet("refunds")]
    public async Task<IActionResult> Refunds([FromQuery] int? orderId) => Ok(new { items = await _service.GetRefundsAsync(orderId) });
    [HttpGet("receivables")]
    public async Task<IActionResult> Receivables() => Ok(new { items = await _service.GetReceivablesAsync() });

    [HttpGet("shifts")]
    public async Task<IActionResult> Shifts([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? staffUserId) => Ok(new { items = await _service.GetShiftsAsync(from, to, staffUserId) });
    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPost("shifts")]
    public async Task<IActionResult> CreateShift(CreateStaffShiftRequest request) { try { var id = await _service.CreateShiftAsync(request, CurrentUserId); await AddAuditAsync("StaffShift", id, "Create", $"StaffUserId={request.StaffUserId}"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("shifts/{id:int}")]
    public async Task<IActionResult> UpdateShift(int id, UpdateStaffShiftRequest request) { try { await _service.UpdateShiftAsync(id, request); await AddAuditAsync("StaffShift", id, "Update", $"Status={request.ShiftStatus}"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("shifts/{id:int}")]
    public async Task<IActionResult> DeleteShift(int id) { try { await _service.DeleteShiftAsync(id); await AddAuditAsync("StaffShift", id, "Cancel"); return Ok(new { id }); } catch (AdvancedOperationsException ex) { return BadRequest(new { message = ex.Message }); } }
}
