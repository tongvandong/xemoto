using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("interactions")]
    public async Task<IActionResult> Interactions()
    {
        var result = await _service.GetInteractionsAsync();
        return Ok(result);
    }

    [HttpPost("interactions")]
    public async Task<IActionResult> CreateInteraction(CustomerInteractionRequest request)
    {
        return await CreateAsync(
            () => _service.CreateInteractionAsync(request),
            id => AddAuditAsync("CustomerInteraction", id.ToString(), "Create", request.Subject));
    }

    [HttpPost("interactions/{id:int}/complete")]
    public async Task<IActionResult> CompleteInteraction(int id)
    {
        var result = await RunAsync(() => _service.CompleteInteractionAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Complete");
        }

        return result;
    }

    [HttpPut("interactions/{id:int}")]
    public async Task<IActionResult> UpdateInteraction(int id, CustomerInteractionRequest request)
    {
        var result = await RunAsync(() => _service.UpdateInteractionAsync(id, request));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Update", request.Subject);
        }

        return result;
    }

    [HttpPost("interactions/{id:int}/cancel")]
    public async Task<IActionResult> CancelInteraction(int id)
    {
        var result = await RunAsync(() => _service.CancelInteractionAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Cancel");
        }

        return result;
    }
}
