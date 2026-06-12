using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("repairs")]
    public async Task<IActionResult> Repairs()
    {
        var result = await _service.GetRepairsAsync();
        return Ok(result);
    }

    [HttpPost("repairs")]
    public async Task<IActionResult> CreateRepair(CreateRepairOrderRequest request)
    {
        return await CreateAsync(
            () => _service.CreateRepairAsync(request),
            id =>
            {
                string auditValue = $"{request.VehicleDescription};{request.ReportedIssue}";
                return AddAuditAsync("RepairOrder", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPut("repairs/{id:int}")]
    public async Task<IActionResult> UpdateRepair(int id, CreateRepairOrderRequest request)
    {
        var result = await RunAsync(() => _service.UpdateRepairAsync(id, request));

        if (result is OkResult)
        {
            await AddAuditAsync("RepairOrder", id.ToString(), "Update", request.VehicleDescription);
        }

        return result;
    }

    [HttpPut("repairs/{id:int}/status")]
    public async Task<IActionResult> RepairStatus(int id, UpdateRepairStatusRequest request)
    {
        var result = await RunAsync(() => _service.UpdateRepairStatusAsync(id, request));

        if (result is OkResult)
        {
            string auditValue = $"{request.Status};{request.Note}";
            await AddAuditAsync("RepairOrder", id.ToString(), "UpdateStatus", auditValue);
        }

        return result;
    }
}
