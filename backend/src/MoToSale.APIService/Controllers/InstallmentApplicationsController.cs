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
[Route("api/installment-applications")]
public class InstallmentApplicationsController : ControllerBase
{
    private readonly IInstallmentService _service;
    private readonly AppDbContext _db;
    public InstallmentApplicationsController(IInstallmentService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }

    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task AddAuditAsync(string action, int id, string? value = null)
    {
        var now = DateTime.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            Entity = "InstallmentApplication", EntityId = id.ToString(), Action = action, NewValueJson = value,
            ActorId = CurrentUserId, ActorName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            At = now, CreatedDate = now,
        });
        await _db.SaveChangesAsync();
    }

    // Khách (đăng nhập hoặc vãng lai) gửi hồ sơ tư vấn trả góp.
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create(CreateInstallmentApplicationRequest request)
    {
        try
        {
            var id = await _service.CreateAsync(request, CurrentUserId);
            return Ok(new { id });
        }
        catch (InstallmentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet]
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    public async Task<IActionResult> List([FromQuery] string? status)
        => Ok(new { items = await _service.GetAllAsync(status) });

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    public async Task<IActionResult> Approve(int id, ApproveInstallmentApplicationRequest request)
    {
        try
        {
            var orderId = await _service.ApproveAsync(id, request, CurrentUserId);
            await AddAuditAsync("Approve", id, $"OrderId={orderId};Partner={request.FinancePartner}");
            return Ok(new { id, orderId });
        }
        catch (InstallmentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    public async Task<IActionResult> Reject(int id, RejectInstallmentApplicationRequest request)
    {
        try
        {
            await _service.RejectAsync(id, request.Note, CurrentUserId);
            await AddAuditAsync("Reject", id, request.Note);
            return Ok(new { id });
        }
        catch (InstallmentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
