using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/warranties")]
public class WarrantiesController : ControllerBase
{
    private readonly IWarrantyService _warranties;

    public WarrantiesController(IWarrantyService warranties)
    {
        _warranties = warranties;
    }

    private int? CurrentUserId
    {
        get
        {
            string? rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            bool parsed = int.TryParse(rawUserId, out int userId);

            return parsed ? userId : null;
        }
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PagingRequest request, [FromQuery] string? status)
    {
        var result = await _warranties.SearchAsync(request, status);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var warranty = await _warranties.GetAsync(id);
        if (warranty == null)
        {
            return NotFound();
        }

        return Ok(warranty);
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveWarrantyRequest request)
    {
        try
        {
            int warrantyId = await _warranties.CreateAsync(request);
            return Ok(new IdResponse { Id = warrantyId });
        }
        catch (WarrantyException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveWarrantyRequest request)
    {
        try
        {
            await _warranties.UpdateAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (WarrantyException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateWarrantyStatusRequest request)
    {
        try
        {
            await _warranties.UpdateStatusAsync(id, request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (WarrantyException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
