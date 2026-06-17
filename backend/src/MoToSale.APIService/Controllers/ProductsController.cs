using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/products")]
public partial class ProductsController : ControllerBase
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
    public async Task<IActionResult> Search([FromQuery] ProductSearchRequest request)
    {
        var result = await _catalog.SearchProductsAsync(request);
        return Ok(result);
    }

    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters()
    {
        var categories = await GetActiveCategoriesAsync();
        var brands = await GetActiveBrandsAsync();
        var carModels = await GetActiveVehicleModelsAsync(brands);
        var brandMap = brands.ToDictionary(brand => brand.Id, brand => brand.Name);

        var partCompatibleTypes = carModels.Select(model => new
        {
            id = model.Id,
            name = model.Name,
            brandId = model.BrandId,
            brandName = brandMap.GetValueOrDefault(model.BrandId) ?? string.Empty,
        });

        return Ok(new
        {
            categories,
            brands,
            carModels,
            partCompatibleTypes,
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _catalog.GetProductAsync(id);
        if (product == null)
        {
            return NotFound();
        }

        return Ok(product);
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateProductRequest request)
    {
        try
        {
            int productId = await _catalog.CreateProductAsync(request);
            return Ok(new IdResponse { Id = productId });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateProductRequest request)
    {
        try
        {
            await _catalog.UpdateProductAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (CatalogException ex)
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
            await _catalog.DeleteProductAsync(id);
            return Ok(new MessageResponse { Message = "Đã xóa sản phẩm." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    private async Task<List<CategoryDto>> GetActiveCategoriesAsync()
    {
        return await _catalog.GetActiveCategoriesAsync();
    }

    private async Task<List<BrandDto>> GetActiveBrandsAsync()
    {
        return await _catalog.GetActiveBrandsAsync();
    }

    private async Task<List<VehicleModelDto>> GetActiveVehicleModelsAsync(List<BrandDto> brands)
    {
        return await _catalog.GetActiveVehicleModelsAsync();
    }
}
