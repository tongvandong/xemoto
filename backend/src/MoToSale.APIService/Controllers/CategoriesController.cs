using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public CategoriesController(ICatalogService catalog) => _catalog = catalog;

    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateCategoryAsync(request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateCategoryRequest request)
    {
        try { await _catalog.UpdateCategoryAsync(id, request); return Ok(new { id }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try { await _catalog.DeleteCategoryAsync(id); return Ok(new { message = "Đã xóa danh mục." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
