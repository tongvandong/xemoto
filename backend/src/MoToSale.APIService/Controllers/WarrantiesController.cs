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
    public WarrantiesController(IWarrantyService warranties) => _warranties = warranties;
    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PagingRequest request, [FromQuery] string? status) => Ok(await _warranties.SearchAsync(request, status));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) { var row = await _warranties.GetAsync(id); return row is null ? NotFound() : Ok(row); }

    [HttpPost]
    public async Task<IActionResult> Create(SaveWarrantyRequest request)
    {
        try { return Ok(new { id = await _warranties.CreateAsync(request) }); }
        catch (WarrantyException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SaveWarrantyRequest request)
    {
        try { await _warranties.UpdateAsync(id, request); return Ok(new { id }); }
        catch (WarrantyException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateWarrantyStatusRequest request)
    {
        try { await _warranties.UpdateStatusAsync(id, request, CurrentUserId); return Ok(new { id }); }
        catch (WarrantyException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
