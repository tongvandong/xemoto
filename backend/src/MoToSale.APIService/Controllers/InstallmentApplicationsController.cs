using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;
using MoToSale.Services.Audit;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/installment-applications")]
public class InstallmentApplicationsController : ControllerBase
{
    private readonly IInstallmentService _service;
    private readonly IAuditLogService _auditLogs;

    public InstallmentApplicationsController(IInstallmentService service, IAuditLogService auditLogs)
    {
        _service = service;
        _auditLogs = auditLogs;
    }

    private int? CurrentUserId
    {
        get
        {
            string? rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(rawUserId, out int userId))
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

    // Khách (đăng nhập hoặc vãng lai) gửi hồ sơ tư vấn trả góp.
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create(CreateInstallmentApplicationRequest request)
    {
        try
        {
            var id = await _service.CreateAsync(request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
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
            await _auditLogs.AddAsync(
                "InstallmentApplication",
                id.ToString(),
                "Approve",
                $"OrderId={orderId};Partner={request.FinancePartner}",
                CurrentUserId,
                CurrentActorName);

            return Ok(new { id, orderId });
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    public async Task<IActionResult> Reject(int id, RejectInstallmentApplicationRequest request)
    {
        try
        {
            await _service.RejectAsync(id, request.Note, CurrentUserId);
            await _auditLogs.AddAsync(
                "InstallmentApplication",
                id.ToString(),
                "Reject",
                request.Note,
                CurrentUserId,
                CurrentActorName);

            return Ok(new IdResponse { Id = id });
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
    }
}
