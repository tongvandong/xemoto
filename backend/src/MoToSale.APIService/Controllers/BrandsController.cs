using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Models;
using MoToSale.APIService.Services;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/brands")]
public class BrandsController : ControllerBase
{
    private readonly ICatalogService _catalog;
    private readonly IImageStorage _storage;

    public BrandsController(ICatalogService catalog, IImageStorage storage)
    {
        _catalog = catalog;
        _storage = storage;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBrandRequest request)
    {
        try { return Ok(new { id = await _catalog.CreateBrandAsync(request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateBrandRequest request)
    {
        try { await _catalog.UpdateBrandAsync(id, request); return Ok(new { id }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try { await _catalog.DeleteBrandAsync(id); return Ok(new { message = "Đã xóa hãng." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:int}/logo")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadLogo(int id, [FromForm] UploadFileRequest request)
    {
        try
        {
            var url = await _storage.SaveAsync(request.File, "brands", HttpContext.RequestAborted);
            await _catalog.SetBrandLogoAsync(id, url); // persist vào hãng
            return Ok(new { url });
        }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
