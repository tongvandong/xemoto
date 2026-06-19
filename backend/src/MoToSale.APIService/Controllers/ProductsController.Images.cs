using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

public partial class ProductsController
{
    [HttpGet("{id:int}/images")]
    public async Task<IActionResult> GetImages(int id)
    {
        List<ProductImageDto> items = await _catalog.GetImagesAsync(id);
        return Ok(new ItemsResponse<ProductImageDto> { Items = items });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/images")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(int id, [FromForm] UploadProductImageRequest request)
    {
        try
        {
            string imageUrl = await _storage.SaveAsync(request.File, "products", HttpContext.RequestAborted);
            var addImageRequest = new AddImageRequest(imageUrl, request.Alt, request.SkuId, request.IsPrimary, request.SortOrder);
            int imageId = await _catalog.AddImageAsync(id, addImageRequest);

            return Ok(new ProductImageUploadResponse { Id = imageId, Url = imageUrl });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/images/url")]
    public async Task<IActionResult> AddImageUrl(int id, AddImageUrlRequest request)
    {
        try
        {
            var addImageRequest = new AddImageRequest(request.Url, request.Alt, request.SkuId, request.IsPrimary, request.SortOrder);
            int imageId = await _catalog.AddImageAsync(id, addImageRequest);

            return Ok(new ProductImageUploadResponse { Id = imageId, Url = request.Url.Trim() });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/images/{imageId:int}/primary")]
    public async Task<IActionResult> SetPrimary(int id, int imageId)
    {
        try
        {
            await _catalog.SetPrimaryImageAsync(id, imageId);
            return Ok(new IdResponse { Id = imageId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
    {
        try
        {
            await _catalog.DeleteImageAsync(id, imageId);
            return Ok(new MessageResponse { Message = "Đã xóa ảnh." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
