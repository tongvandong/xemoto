using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Services.Payments;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;

    public PaymentsController(IPaymentService payments)
    {
        _payments = payments;
    }

    private int? CurrentUserId
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

    [HttpPost]
    public async Task<IActionResult> Record(CreatePaymentRequest request)
    {
        try
        {
            int id = await _payments.RecordPaymentAsync(request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (PaymentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<IActionResult> GetByOrder(int orderId)
    {
        var items = await _payments.GetByOrderAsync(orderId);
        return Ok(new { items });
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PagingRequest request, [FromQuery] string? status)
    {
        var result = await _payments.SearchAsync(request, status);
        return Ok(result);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancelPaymentRequest request)
    {
        try
        {
            await _payments.CancelAsync(id, request.Reason);
            return Ok(new MessageResponse { Message = "Đã hủy phiếu thanh toán." });
        }
        catch (PaymentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        try
        {
            await _payments.ConfirmPaymentAsync(id, CurrentUserId);
            return Ok(new MessageResponse { Message = "Đã xác nhận thanh toán." });
        }
        catch (PaymentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
