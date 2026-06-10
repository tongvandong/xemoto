using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Models;
using MoToSale.APIService.Services;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private const string StaffRoles = $"{RoleConstant.Admin},{RoleConstant.Staff}";

    private readonly ICatalogService _catalog;
    private readonly IImageStorage _storage;

    public ProductsController(ICatalogService catalog, IImageStorage storage)
    {
        _catalog = catalog;
        _storage = storage;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] ProductSearchRequest request) =>
        Ok(await _catalog.SearchProductsAsync(request));

    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters()
    {
        var categories = (await _catalog.GetCategoriesAsync())
            .Where(x => x.Status == (int)MoToSale.Common.EntityStatus.Active)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToList();
        var brands = (await _catalog.GetBrandsAsync())
            .Where(x => x.Status == (int)MoToSale.Common.EntityStatus.Active)
            .OrderBy(x => x.Name)
            .ToList();
        var brandMap = brands.ToDictionary(x => x.Id, x => x.Name);
        var carModels = (await _catalog.GetVehicleModelsAsync(null))
            .Where(x => x.Status == (int)MoToSale.Common.EntityStatus.Active)
            .OrderBy(x => brandMap.GetValueOrDefault(x.BrandId))
            .ThenBy(x => x.Name)
            .ToList();

        return Ok(new
        {
            categories,
            brands,
            carModels,
            partCompatibleTypes = carModels.Select(x => new
            {
                id = x.Id,
                name = x.Name,
                brandId = x.BrandId,
                brandName = brandMap.GetValueOrDefault(x.BrandId) ?? "",
            }),
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _catalog.GetProductAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateProductRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateProductAsync(request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateProductRequest request)
    {
        try { await _catalog.UpdateProductAsync(id, request); return Ok(new { id }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try { await _catalog.DeleteProductAsync(id); return Ok(new { message = "Đã ngừng kinh doanh sản phẩm." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ===== Biến thể (SKU) =====
    [HttpGet("{id:int}/skus")]
    public async Task<IActionResult> GetSkus(int id) => Ok(new { items = await _catalog.GetSkusByProductAsync(id) });

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/skus")]
    public async Task<IActionResult> CreateSku(int id, CreateSkuRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateSkuAsync(id, request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/skus/{skuId:int}")]
    public async Task<IActionResult> UpdateSku(int id, int skuId, UpdateSkuRequest request)
    {
        try { await _catalog.UpdateSkuAsync(id, skuId, request); return Ok(new { id = skuId }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/skus/{skuId:int}")]
    public async Task<IActionResult> DeleteSku(int id, int skuId)
    {
        try { await _catalog.DeleteSkuAsync(id, skuId); return Ok(new { message = "Đã xóa biến thể." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ===== Ảnh sản phẩm / ảnh biến thể =====
    [HttpGet("{id:int}/images")]
    public async Task<IActionResult> GetImages(int id) => Ok(new { items = await _catalog.GetImagesAsync(id) });

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/images")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(int id, [FromForm] UploadProductImageRequest request)
    {
        try
        {
            var url = await _storage.SaveAsync(request.File, "products", HttpContext.RequestAborted);
            var imageId = await _catalog.AddImageAsync(id, new AddImageRequest(url, request.Alt, request.SkuId, request.IsPrimary, request.SortOrder));
            return Ok(new { id = imageId, url });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/images/{imageId:int}/primary")]
    public async Task<IActionResult> SetPrimary(int id, int imageId)
    {
        try { await _catalog.SetPrimaryImageAsync(id, imageId); return Ok(new { id = imageId }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
    {
        try { await _catalog.DeleteImageAsync(id, imageId); return Ok(new { message = "Đã xóa ảnh." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ===== Tương thích phụ tùng =====
    [HttpGet("{id:int}/compatibilities")]
    public async Task<IActionResult> GetCompatibilities(int id) => Ok(new { items = await _catalog.GetCompatibilitiesAsync(id) });

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/compatibilities")]
    public async Task<IActionResult> CreateCompatibility(int id, SaveCompatibilityRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateCompatibilityAsync(id, request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/compatibilities/{compatId:int}")]
    public async Task<IActionResult> UpdateCompatibility(int id, int compatId, SaveCompatibilityRequest request)
    {
        try { await _catalog.UpdateCompatibilityAsync(id, compatId, request); return Ok(new { id = compatId }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/compatibilities/{compatId:int}")]
    public async Task<IActionResult> DeleteCompatibility(int id, int compatId)
    {
        try { await _catalog.DeleteCompatibilityAsync(id, compatId); return Ok(new { message = "Đã xóa." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ===== Khuyến mãi / bán kèm / mã vạch / tuổi tồn =====
    [HttpGet("{id:int}/promotions")]
    public async Task<IActionResult> GetPromotions(int id)
    {
        try { return Ok(new { items = await _catalog.GetPromotionsAsync(id) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:int}/related")]
    public async Task<IActionResult> GetRelatedItems(int id)
    {
        try { return Ok(new { items = await _catalog.GetRelatedItemsAsync(id) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("{id:int}/related")]
    public async Task<IActionResult> CreateRelatedItem(int id, SaveProductRelatedItemRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateRelatedItemAsync(id, request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}/related/{relatedId:int}")]
    public async Task<IActionResult> UpdateRelatedItem(int id, int relatedId, SaveProductRelatedItemRequest request)
    {
        try { await _catalog.UpdateRelatedItemAsync(id, relatedId, request); return Ok(new { id = relatedId }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpDelete("{id:int}/related/{relatedId:int}")]
    public async Task<IActionResult> DeleteRelatedItem(int id, int relatedId)
    {
        try { await _catalog.DeleteRelatedItemAsync(id, relatedId); return Ok(new { message = "Đã xóa sản phẩm bán kèm." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:int}/inventory-aging")]
    public async Task<IActionResult> GetInventoryAging(int id)
    {
        try { return Ok(new { items = await _catalog.GetInventoryAgingAsync(id) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:int}/barcodes")]
    public async Task<IActionResult> GetBarcodeLabels(int id)
    {
        try { return Ok(new { items = await _catalog.GetBarcodeLabelsAsync(id) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
