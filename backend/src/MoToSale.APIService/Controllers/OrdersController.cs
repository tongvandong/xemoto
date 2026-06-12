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
public partial class OrdersController : ControllerBase
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

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        List<OrderListItem> items = await _orders.GetMyOrdersAsync(CurrentUserId);
        return Ok(new ItemsResponse<OrderListItem> { Items = items });
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

            return Ok(new PaymentClaimResponse { Id = paymentId, Status = "AwaitingConfirmation" });
        }
        catch (PaymentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
