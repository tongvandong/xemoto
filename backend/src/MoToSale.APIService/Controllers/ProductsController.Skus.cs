using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

public partial class ProductsController
{
    [HttpGet("{id:int}/skus")]
    public async Task<IActionResult> GetSkus(int id)
    {
        var items = await _catalog.GetSkusByProductAsync(id);
        return Ok(new { items });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/skus")]
    public async Task<IActionResult> CreateSku(int id, CreateSkuRequest request)
    {
        try
        {
            int skuId = await _catalog.CreateSkuAsync(id, request);
            return Ok(new IdResponse { Id = skuId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/skus/{skuId:int}")]
    public async Task<IActionResult> UpdateSku(int id, int skuId, UpdateSkuRequest request)
    {
        try
        {
            await _catalog.UpdateSkuAsync(id, skuId, request);
            return Ok(new IdResponse { Id = skuId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/skus/{skuId:int}")]
    public async Task<IActionResult> DeleteSku(int id, int skuId)
    {
        try
        {
            await _catalog.DeleteSkuAsync(id, skuId);
            return Ok(new MessageResponse { Message = "Đã xóa biến thể." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
