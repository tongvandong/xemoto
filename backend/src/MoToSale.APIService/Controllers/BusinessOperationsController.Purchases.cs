using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("purchases")]
    public async Task<IActionResult> Purchases()
    {
        var result = await _service.GetPurchaseOrdersAsync();
        return Ok(result);
    }

    [HttpPost("purchases")]
    public async Task<IActionResult> CreatePurchase(CreatePurchaseOrderRequest request)
    {
        return await CreateAsync(
            () => _service.CreatePurchaseOrderAsync(request, UserId),
            id =>
            {
                string auditValue = $"SupplierId={request.SupplierId};Lines={request.Lines.Count}";
                return AddAuditAsync("PurchaseOrder", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPost("purchases/{id:int}/approve")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ApprovePurchase(int id)
    {
        var result = await RunAsync(() => _service.ApprovePurchaseOrderAsync(id, UserId));

        if (result is OkResult)
        {
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Approve");
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/cancel")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CancelPurchase(int id)
    {
        var result = await RunAsync(() => _service.CancelPurchaseOrderAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Cancel");
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/receive")]
    public async Task<IActionResult> ReceivePurchase(int id, ReceivePurchaseOrderRequest request)
    {
        var result = await CreateAsync(() => _service.ReceivePurchaseOrderAsync(id, request, UserId));

        if (result is OkObjectResult)
        {
            string auditValue = $"Lines={request.Lines.Count}";
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Receive", auditValue);
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/pay")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> PayPurchase(int id, PayPurchaseOrderRequest request)
    {
        var result = await CreateAsync(() => _service.PayPurchaseOrderAsync(id, request, UserId));

        if (result is OkObjectResult)
        {
            string auditValue = $"Amount={request.Amount};Method={request.Method}";
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Pay", auditValue);
        }

        return result;
    }
}
