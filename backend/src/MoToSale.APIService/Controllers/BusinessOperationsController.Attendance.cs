using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("attendance")]
    public async Task<IActionResult> Attendance()
    {
        var result = await _service.GetAttendanceAsync();
        return Ok(result);
    }

    [HttpPost("attendance/check-in")]
    public async Task<IActionResult> CheckIn(AttendanceRequest request)
    {
        bool currentUserIsAdmin = User.IsInRole(RoleConstant.Admin);
        bool currentUserOwnsAttendance = UserId == request.StaffUserId;

        if (!currentUserIsAdmin && !currentUserOwnsAttendance)
        {
            return Forbid();
        }

        return await CreateAsync(
            () => _service.CheckInAsync(request),
            id =>
            {
                string auditValue = $"Staff={request.StaffUserId}";
                return AddAuditAsync("StaffAttendance", id.ToString(), "CheckIn", auditValue);
            });
    }

    [HttpPost("attendance/{id:int}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        int staffUserId;
        try
        {
            staffUserId = await _service.GetAttendanceStaffUserIdAsync(id);
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }

        bool currentUserIsAdmin = User.IsInRole(RoleConstant.Admin);
        bool currentUserOwnsAttendance = UserId == staffUserId;

        if (!currentUserIsAdmin && !currentUserOwnsAttendance)
        {
            return Forbid();
        }

        var result = await RunAsync(() => _service.CheckOutAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("StaffAttendance", id.ToString(), "CheckOut");
        }

        return result;
    }
}
