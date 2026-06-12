using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

public partial class ProductsController
{
    [HttpGet("{id:int}/compatibilities")]
    public async Task<IActionResult> GetCompatibilities(int id)
    {
        List<CompatibilityDto> items = await _catalog.GetCompatibilitiesAsync(id);
        return Ok(new ItemsResponse<CompatibilityDto> { Items = items });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/compatibilities")]
    public async Task<IActionResult> CreateCompatibility(int id, SaveCompatibilityRequest request)
    {
        try
        {
            int compatibilityId = await _catalog.CreateCompatibilityAsync(id, request);
            return Ok(new IdResponse { Id = compatibilityId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/compatibilities/{compatId:int}")]
    public async Task<IActionResult> UpdateCompatibility(int id, int compatId, SaveCompatibilityRequest request)
    {
        try
        {
            await _catalog.UpdateCompatibilityAsync(id, compatId, request);
            return Ok(new IdResponse { Id = compatId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/compatibilities/{compatId:int}")]
    public async Task<IActionResult> DeleteCompatibility(int id, int compatId)
    {
        try
        {
            await _catalog.DeleteCompatibilityAsync(id, compatId);
            return Ok(new MessageResponse { Message = "Đã xóa." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
