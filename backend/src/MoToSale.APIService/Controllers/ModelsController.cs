using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/models")]
public class ModelsController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public ModelsController(ICatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateModelRequest request)
    {
        try
        {
            int id = await _catalog.CreateModelAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateModelRequest request)
    {
        try
        {
            await _catalog.UpdateModelAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _catalog.DeleteModelAsync(id);
            return Ok(new MessageResponse { Message = "Đã xóa dòng xe." });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
