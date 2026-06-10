using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Payments;
using MoToSale.Services.Payments;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;

    public PaymentsController(IPaymentService payments) => _payments = payments;

    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>Admin/staff ghi nhận thanh toán thủ công (đã nhận cọc/đủ tiền).</summary>
    [HttpPost]
    public async Task<IActionResult> Record(CreatePaymentRequest request)
    {
        try { return Ok(new { id = await _payments.RecordPaymentAsync(request, CurrentUserId) }); }
        catch (PaymentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<IActionResult> GetByOrder(int orderId) =>
        Ok(new { items = await _payments.GetByOrderAsync(orderId) });

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] MoToSale.DTO.Common.PagingRequest request, [FromQuery] string? status) =>
        Ok(await _payments.SearchAsync(request, status));

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancelPaymentRequest request)
    {
        try { await _payments.CancelAsync(id, request.Reason); return Ok(new { message = "Đã hủy phiếu thanh toán." }); }
        catch (PaymentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Admin/staff xác nhận phiếu chuyển khoản khách báo (đang chờ xác nhận).</summary>
    [HttpPost("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        try { await _payments.ConfirmPaymentAsync(id, CurrentUserId); return Ok(new { message = "Đã xác nhận thanh toán." }); }
        catch (PaymentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
