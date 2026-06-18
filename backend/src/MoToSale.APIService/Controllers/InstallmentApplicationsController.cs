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
        catch (Exception)
        {
            return StatusCode(500, new MessageResponse
            {
                Message = "Không thể lưu hồ sơ trả góp. Vui lòng kiểm tra/migrate database và thử lại.",
            });
        }
    }

    [HttpGet]
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        List<InstallmentApplicationDto> items = await _service.GetAllAsync(status);
        return Ok(new ItemsResponse<InstallmentApplicationDto> { Items = items });
    }

    // Khách đã đăng nhập xem các hồ sơ trả góp của chính mình.
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> Mine()
    {
        if (CurrentUserId is null) return Unauthorized();
        var items = await _service.GetMineAsync(CurrentUserId.Value);
        return Ok(new ItemsResponse<InstallmentApplicationDto> { Items = items });
    }

    private bool IsStaff => User.IsInRole(RoleConstant.Admin) || User.IsInRole(RoleConstant.Staff);

    // Chi tiết một hồ sơ (chủ hồ sơ hoặc nhân viên).
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var dto = await _service.GetByIdAsync(id, CurrentUserId, IsStaff);
            if (dto is null) return NotFound(new MessageResponse { Message = "Không tìm thấy hồ sơ trả góp." });
            return Ok(dto);
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
    }

    // Khách tự sửa hồ sơ khi còn đang chờ duyệt.
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, UpdateInstallmentApplicationRequest request)
    {
        try
        {
            await _service.UpdateAsync(id, request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
    }

    // Khách tự hủy (rút) hồ sơ khi còn đang chờ duyệt.
    [HttpPost("{id:int}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelMine(int id)
    {
        try
        {
            await _service.CancelOwnAsync(id, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (InstallmentException ex) { return BadRequest(new MessageResponse { Message = ex.Message }); }
    }

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

            return Ok(new ApproveInstallmentApplicationResponse { Id = id, OrderId = orderId });
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
