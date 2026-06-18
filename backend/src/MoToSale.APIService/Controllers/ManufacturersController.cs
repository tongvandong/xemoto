using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/manufacturers")]
public class ManufacturersController : ControllerBase
{
    private readonly ICatalogService _catalog;
    private readonly IImageStorage _storage;

    public ManufacturersController(ICatalogService catalog, IImageStorage storage)
    {
        _catalog = catalog;
        _storage = storage;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ManufacturerSearchRequest request)
    {
        PagingResponse<ManufacturerDto> result = await _catalog.SearchManufacturersAsync(request);
        return Ok(result);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost]
    public async Task<IActionResult> Create(SaveManufacturerRequest request)
    {
        try
        {
            int id = await _catalog.CreateManufacturerAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveManufacturerRequest request)
    {
        try
        {
            await _catalog.UpdateManufacturerAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("{id:int}/logo")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadLogo(int id, [FromForm] UploadFileRequest request)
    {
        try
        {
            string url = await _storage.SaveAsync(request.File, "manufacturers", HttpContext.RequestAborted);

            await _catalog.SetManufacturerLogoAsync(id, url);

            return Ok(new UrlResponse { Url = url });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
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
            await _catalog.DeleteManufacturerAsync(id);
            return Ok(new MessageResponse { Message = "Đã xóa." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
