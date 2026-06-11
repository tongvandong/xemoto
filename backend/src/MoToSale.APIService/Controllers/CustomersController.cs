using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.Services.Customers;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerProfileService _customers;

    public CustomersController(ICustomerProfileService customers)
    {
        _customers = customers;
    }

    [HttpGet("{id:int}/profile")]
    public async Task<IActionResult> Profile(int id)
    {
        var profile = await _customers.GetProfileAsync(id);

        if (profile == null)
        {
            return NotFound(new MessageResponse { Message = "Không tìm thấy khách hàng." });
        }

        return Ok(profile);
    }
}
