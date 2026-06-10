using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/vouchers")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _vouchers;

    public VouchersController(IVoucherService vouchers) => _vouchers = vouchers;

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PagingRequest request) => Ok(await _vouchers.SearchAsync(request));

    [AllowAnonymous]
    [HttpGet("available")]
    public async Task<IActionResult> Available() => Ok(new { items = await _vouchers.GetAvailableAsync() });

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var v = await _vouchers.GetAsync(id);
        return v is null ? NotFound() : Ok(v);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost]
    public async Task<IActionResult> Create(SaveVoucherRequest request)
    {
        try { return Ok(new { id = await _vouchers.CreateAsync(request) }); }
        catch (VoucherException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveVoucherRequest request)
    {
        try { await _vouchers.UpdateAsync(id, request); return Ok(new { id }); }
        catch (VoucherException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try { await _vouchers.DeleteAsync(id); return Ok(new { message = "Đã xóa voucher." }); }
        catch (VoucherException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Khách kiểm tra voucher khi đặt hàng.</summary>
    [Authorize]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateVoucherBody body) =>
        Ok(await _vouchers.ValidateAsync(body.Code, body.Subtotal));
}

public record ValidateVoucherBody(string Code, decimal Subtotal);
