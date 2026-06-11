using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.Services.Reports;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;

    public ReportsController(IReportService reports)
    {
        _reports = reports;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var report = await _reports.GetSummaryAsync();
        return Ok(report);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var report = await _reports.GetDashboardAsync();
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> Report([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] int top = 10)
    {
        try
        {
            var report = await _reports.GetReportAsync(startDate, endDate, top);
            return Ok(report);
        }
        catch (ReportException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
