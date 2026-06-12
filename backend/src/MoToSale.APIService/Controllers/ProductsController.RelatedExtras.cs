using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

public partial class ProductsController
{
    [HttpGet("{id:int}/promotions")]
    public async Task<IActionResult> GetPromotions(int id)
    {
        try
        {
            List<ProductPromotionDto> items = await _catalog.GetPromotionsAsync(id);
            return Ok(new ItemsResponse<ProductPromotionDto> { Items = items });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("{id:int}/related")]
    public async Task<IActionResult> GetRelatedItems(int id)
    {
        try
        {
            List<ProductRelatedItemDto> items = await _catalog.GetRelatedItemsAsync(id);
            return Ok(new ItemsResponse<ProductRelatedItemDto> { Items = items });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/related")]
    public async Task<IActionResult> CreateRelatedItem(int id, SaveProductRelatedItemRequest request)
    {
        try
        {
            int relatedItemId = await _catalog.CreateRelatedItemAsync(id, request);
            return Ok(new IdResponse { Id = relatedItemId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/related/{relatedId:int}")]
    public async Task<IActionResult> UpdateRelatedItem(int id, int relatedId, SaveProductRelatedItemRequest request)
    {
        try
        {
            await _catalog.UpdateRelatedItemAsync(id, relatedId, request);
            return Ok(new IdResponse { Id = relatedId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/related/{relatedId:int}")]
    public async Task<IActionResult> DeleteRelatedItem(int id, int relatedId)
    {
        try
        {
            await _catalog.DeleteRelatedItemAsync(id, relatedId);
            return Ok(new MessageResponse { Message = "Đã xóa sản phẩm bán kèm." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("{id:int}/inventory-aging")]
    public async Task<IActionResult> GetInventoryAging(int id)
    {
        try
        {
            List<ProductInventoryAgingDto> items = await _catalog.GetInventoryAgingAsync(id);
            return Ok(new ItemsResponse<ProductInventoryAgingDto> { Items = items });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("{id:int}/barcodes")]
    public async Task<IActionResult> GetBarcodeLabels(int id)
    {
        try
        {
            List<BarcodeLabelDto> items = await _catalog.GetBarcodeLabelsAsync(id);
            return Ok(new ItemsResponse<BarcodeLabelDto> { Items = items });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
