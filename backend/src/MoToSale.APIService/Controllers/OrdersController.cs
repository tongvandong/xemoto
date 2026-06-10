using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Audit;
using MoToSale.Repository;
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
    private readonly AppDbContext _db;

    public OrdersController(IOrderService orders, IPaymentService payments, AppDbContext db)
    {
        _orders = orders;
        _payments = payments;
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private int? UserIdOrNull => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsStaff => User.IsInRole(RoleConstant.Admin) || User.IsInRole(RoleConstant.Staff);

    private async Task AddAuditAsync(int orderId, string action, string? newValue = null)
    {
        var now = DateTime.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            Entity = "Order",
            EntityId = orderId.ToString(),
            Action = action,
            NewValueJson = newValue,
            ActorId = UserIdOrNull,
            ActorName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            At = now,
            CreatedDate = now
        });
        await _db.SaveChangesAsync();
    }

    [HttpPost]
    public async Task<IActionResult> Checkout(CheckoutRequest request)
    {
        try { return Ok(new { id = await _orders.CheckoutAsync(CurrentUserId, request) }); }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Admin/staff lập đơn bán tại quầy (POS): trừ kho ngay nếu bán đứt, hỗ trợ đặt cọc, ghi thu tiền.</summary>
    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("pos")]
    public async Task<IActionResult> CreatePos(PosOrderRequest request)
    {
        try
        {
            var orderId = await _orders.CreatePosOrderAsync(request, UserIdOrNull);
            await AddAuditAsync(orderId, "CreatePos", $"Lines={request.Lines?.Count ?? 0};Type={request.OrderType};Paid={request.PaidAmount}");
            return Ok(new { id = orderId });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine() => Ok(new { items = await _orders.GetMyOrdersAsync(CurrentUserId) });

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _orders.GetOrderAsync(id);
        if (order is null) return NotFound();
        if (!IsStaff && order.UserId != CurrentUserId) return NotFound();
        return Ok(order);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancelOrderRequest request)
    {
        if (!IsStaff)
        {
            var order = await _orders.GetOrderAsync(id);
            if (order is null || order.UserId != CurrentUserId) return NotFound();
        }
        try
        {
            await _orders.CancelOrderAsync(id, request.Reason, UserIdOrNull);
            await AddAuditAsync(id, "Cancel", request.Reason);
            return Ok(new { message = "Đã hủy đơn." });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Khách báo đã chuyển khoản: tạo phiếu thanh toán chờ xác nhận cho đơn của mình.</summary>
    [HttpPost("{id:int}/payment-claim")]
    public async Task<IActionResult> ClaimTransfer(int id)
    {
        var order = await _orders.GetOrderAsync(id);
        if (order is null) return NotFound();
        if (!IsStaff && order.UserId != CurrentUserId) return NotFound();
        try
        {
            var pid = await _payments.ClaimTransferAsync(id, UserIdOrNull);
            await AddAuditAsync(id, "PaymentClaim", "Khách báo đã chuyển khoản");
            return Ok(new { id = pid, status = "AwaitingConfirmation" });
        }
        catch (PaymentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] OrderSearchRequest request) =>
        Ok(await _orders.SearchOrdersAsync(request));

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet("{id:int}/allocation-suggestion")]
    public async Task<IActionResult> AllocationSuggestion(int id)
    {
        try { return Ok(new { items = await _orders.GetAllocationSuggestionAsync(id) }); }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("{id:int}/allocate")]
    public async Task<IActionResult> Allocate(int id, AllocateRequest request)
    {
        try
        {
            await _orders.AllocateAsync(id, request, UserIdOrNull);
            await AddAuditAsync(id, "Allocate", $"Lines={request.Allocations.Count}");
            return Ok(new { message = "Đã soạn hàng & xuất kho." });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateOrderRequest request)
    {
        try
        {
            await _orders.UpdateOrderAsync(id, request, UserIdOrNull);
            await AddAuditAsync(id, "Update", $"Lines={(request.Lines?.Count ?? 0)}");
            return Ok(new { message = "Đã cập nhật đơn hàng." });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("{id:int}/fulfill")]
    public async Task<IActionResult> Fulfill(int id)
    {
        try
        {
            await _orders.FulfillAsync(id, UserIdOrNull);
            await AddAuditAsync(id, "Fulfill", "Giao hàng & xuất kho");
            return Ok(new { message = "Đã giao hàng & xuất kho." });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        try
        {
            await _orders.UpdateStatusAsync(id, request, UserIdOrNull);
            await AddAuditAsync(id, "UpdateStatus", $"{request.ToStatus};{request.Note}");
            return Ok(new { id });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}/fulfillment-status")]
    public async Task<IActionResult> UpdateFulfillmentStatus(int id, UpdateFulfillmentStatusRequest request)
    {
        try
        {
            await _orders.UpdateFulfillmentStatusAsync(id, request, UserIdOrNull);
            await AddAuditAsync(id, "UpdateFulfillmentStatus", $"{request.ToStatus};{request.Note}");
            return Ok(new { id });
        }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
