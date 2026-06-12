using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

/// <summary>Tra cứu danh mục/hãng/dòng xe/SKU dùng chung cho dropdown ở admin và storefront.</summary>
[ApiController]
[Route("api")]
public class CatalogLookupController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public CatalogLookupController(ICatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories()
    {
        List<CategoryDto> categories = await _catalog.GetCategoriesAsync();
        return Ok(new ItemsResponse<CategoryDto> { Items = categories });
    }

    [HttpGet("brands")]
    public async Task<IActionResult> Brands()
    {
        List<BrandDto> brands = await _catalog.GetBrandsAsync();
        return Ok(new ItemsResponse<BrandDto> { Items = brands });
    }

    [HttpGet("models")]
    public async Task<IActionResult> Models([FromQuery] int? brandId)
    {
        List<VehicleModelDto> models = await _catalog.GetVehicleModelsAsync(brandId);
        return Ok(new ItemsResponse<VehicleModelDto> { Items = models });
    }

    [HttpGet("skus")]
    public async Task<IActionResult> Skus()
    {
        List<SkuLookupDto> skus = await _catalog.GetSkusAsync();
        return Ok(new ItemsResponse<SkuLookupDto> { Items = skus });
    }
}
