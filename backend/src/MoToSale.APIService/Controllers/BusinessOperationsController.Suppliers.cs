using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("suppliers")]
    public async Task<IActionResult> Suppliers()
    {
        var result = await _service.GetSuppliersAsync();
        return Ok(result);
    }

    [HttpPost("suppliers")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateSupplier(SupplierRequest request)
    {
        return await CreateAsync(
            () => _service.SaveSupplierAsync(null, request),
            id => AddAuditAsync("Supplier", id.ToString(), "Create", request.Name));
    }

    [HttpPut("suppliers/{id:int}")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> UpdateSupplier(int id, SupplierRequest request)
    {
        var result = await CreateAsync(() => _service.SaveSupplierAsync(id, request));

        if (result is OkObjectResult)
        {
            await AddAuditAsync("Supplier", id.ToString(), "Update", request.Name);
        }

        return result;
    }
}
