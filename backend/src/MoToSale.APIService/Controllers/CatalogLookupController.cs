using Microsoft.AspNetCore.Mvc;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api")]
public class CatalogLookupController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public CatalogLookupController(ICatalogService catalog) => _catalog = catalog;

    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Ok(new { items = await _catalog.GetCategoriesAsync() });

    [HttpGet("brands")]
    public async Task<IActionResult> Brands() => Ok(new { items = await _catalog.GetBrandsAsync() });

    [HttpGet("models")]
    public async Task<IActionResult> Models([FromQuery] int? brandId) => Ok(new { items = await _catalog.GetVehicleModelsAsync(brandId) });

    [HttpGet("skus")]
    public async Task<IActionResult> Skus() => Ok(new { items = await _catalog.GetSkusAsync() });
}
