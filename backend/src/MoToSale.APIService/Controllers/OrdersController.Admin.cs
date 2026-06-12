using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Controllers;

public partial class OrdersController : ControllerBase
{
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("pos")]
    public async Task<IActionResult> CreatePos(PosOrderRequest request)
    {
        try
        {
            int orderId = await _orders.CreatePosOrderAsync(request, UserIdOrNull);
            int lineCount = request.Lines == null ? 0 : request.Lines.Count;
            string auditValue = $"Lines={lineCount};Type={request.OrderType};Paid={request.PaidAmount}";

            await AddAuditAsync(orderId, "CreatePos", auditValue);

            return Ok(new IdResponse { Id = orderId });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] OrderSearchRequest request)
    {
        var result = await _orders.SearchOrdersAsync(request);
        return Ok(result);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet("{id:int}/allocation-suggestion")]
    public async Task<IActionResult> AllocationSuggestion(int id)
    {
        try
        {
            List<AllocationSuggestionItem> items = await _orders.GetAllocationSuggestionAsync(id);
            return Ok(new ItemsResponse<AllocationSuggestionItem> { Items = items });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("{id:int}/allocate")]
    public async Task<IActionResult> Allocate(int id, AllocateRequest request)
    {
        try
        {
            await _orders.AllocateAsync(id, request, UserIdOrNull);

            string auditValue = $"Lines={request.Allocations.Count}";
            await AddAuditAsync(id, "Allocate", auditValue);

            return Ok(new MessageResponse { Message = "Đã soạn hàng và xuất kho." });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateOrderRequest request)
    {
        try
        {
            await _orders.UpdateOrderAsync(id, request, UserIdOrNull);

            int lineCount = request.Lines == null ? 0 : request.Lines.Count;
            await AddAuditAsync(id, "Update", $"Lines={lineCount}");

            return Ok(new MessageResponse { Message = "Đã cập nhật đơn hàng." });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("{id:int}/fulfill")]
    public async Task<IActionResult> Fulfill(int id)
    {
        try
        {
            await _orders.FulfillAsync(id, UserIdOrNull);
            await AddAuditAsync(id, "Fulfill", "Giao hàng và xuất kho");

            return Ok(new MessageResponse { Message = "Đã giao hàng và xuất kho." });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        try
        {
            await _orders.UpdateStatusAsync(id, request, UserIdOrNull);

            string auditValue = $"{request.ToStatus};{request.Note}";
            await AddAuditAsync(id, "UpdateStatus", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}/fulfillment-status")]
    public async Task<IActionResult> UpdateFulfillmentStatus(int id, UpdateFulfillmentStatusRequest request)
    {
        try
        {
            await _orders.UpdateFulfillmentStatusAsync(id, request, UserIdOrNull);

            string auditValue = $"{request.ToStatus};{request.Note}";
            await AddAuditAsync(id, "UpdateFulfillmentStatus", auditValue);

            return Ok(new IdResponse { Id = id });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
