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
    private const string StaffRoles = $"{RoleConstant.Admin},{RoleConstant.Staff}";

    private readonly IVoucherService _vouchers;

    public VouchersController(IVoucherService vouchers)
    {
        _vouchers = vouchers;
    }

    [Authorize(Roles = StaffRoles)]
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] VoucherSearchRequest request)
    {
        var result = await _vouchers.SearchAsync(request);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("available")]
    public async Task<IActionResult> Available()
    {
        List<VoucherDto> items = await _vouchers.GetAvailableAsync();
        return Ok(new ItemsResponse<VoucherDto> { Items = items });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var voucher = await _vouchers.GetAsync(id);
        if (voucher == null)
        {
            return NotFound();
        }

        return Ok(voucher);
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost]
    public async Task<IActionResult> Create(SaveVoucherRequest request)
    {
        try
        {
            int voucherId = await _vouchers.CreateAsync(request);
            return Ok(new IdResponse { Id = voucherId });
        }
        catch (VoucherException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveVoucherRequest request)
    {
        try
        {
            await _vouchers.UpdateAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (VoucherException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _vouchers.DeleteAsync(id);
            return Ok(new MessageResponse { Message = "Đã xóa voucher." });
        }
        catch (VoucherException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateVoucherBody body)
    {
        var result = await _vouchers.ValidateAsync(body.Code, body.Subtotal);
        return Ok(result);
    }
}

public record ValidateVoucherBody(string Code, decimal Subtotal);
