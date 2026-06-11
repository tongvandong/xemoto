using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Services.Audit;
using MoToSale.Services.Ordering;
using MoToSale.Services.Payments;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;
    private readonly IPaymentService _payments;
    private readonly IAuditLogService _auditLogs;

    public OrdersController(IOrderService orders, IPaymentService payments, IAuditLogService auditLogs)
    {
        _orders = orders;
        _payments = payments;
        _auditLogs = auditLogs;
    }

    private int CurrentUserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(userIdText!);
        }
    }

    private int? UserIdOrNull
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdText, out int userId))
            {
                return userId;
            }

            return null;
        }
    }

    private bool IsStaff
    {
        get
        {
            bool isAdmin = User.IsInRole(RoleConstant.Admin);
            bool isStaff = User.IsInRole(RoleConstant.Staff);

            return isAdmin || isStaff;
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

    private async Task AddAuditAsync(int orderId, string action, string? newValue = null)
    {
        await _auditLogs.AddAsync("Order", orderId.ToString(), action, newValue, UserIdOrNull, CurrentActorName);
    }

    private async Task<bool> CustomerCanAccessOrderAsync(int orderId)
    {
        if (IsStaff)
        {
            return true;
        }

        var order = await _orders.GetOrderAsync(orderId);

        if (order == null)
        {
            return false;
        }

        return order.UserId == CurrentUserId;
    }

    [HttpPost]
    public async Task<IActionResult> Checkout(CheckoutRequest request)
    {
        try
        {
            int id = await _orders.CheckoutAsync(CurrentUserId, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

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

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var items = await _orders.GetMyOrdersAsync(CurrentUserId);
        return Ok(new { items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _orders.GetOrderAsync(id);

        if (order == null)
        {
            return NotFound();
        }

        if (!IsStaff && order.UserId != CurrentUserId)
        {
            return NotFound();
        }

        return Ok(order);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancelOrderRequest request)
    {
        bool canAccessOrder = await CustomerCanAccessOrderAsync(id);

        if (!canAccessOrder)
        {
            return NotFound();
        }

        try
        {
            await _orders.CancelOrderAsync(id, request.Reason, UserIdOrNull);
            await AddAuditAsync(id, "Cancel", request.Reason);

            return Ok(new MessageResponse { Message = "Đã hủy đơn." });
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("{id:int}/payment-claim")]
    public async Task<IActionResult> ClaimTransfer(int id)
    {
        bool canAccessOrder = await CustomerCanAccessOrderAsync(id);

        if (!canAccessOrder)
        {
            return NotFound();
        }

        try
        {
            int paymentId = await _payments.ClaimTransferAsync(id, UserIdOrNull);
            await AddAuditAsync(id, "PaymentClaim", "Khách báo đã chuyển khoản");

            return Ok(new { id = paymentId, status = "AwaitingConfirmation" });
        }
        catch (PaymentException ex)
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
            var items = await _orders.GetAllocationSuggestionAsync(id);
            return Ok(new { items });
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
