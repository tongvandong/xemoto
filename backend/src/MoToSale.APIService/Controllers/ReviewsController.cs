using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;

    public ReviewsController(IReviewService reviews) => _reviews = reviews;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PagingRequest request, [FromQuery] string? status) => Ok(await _reviews.SearchAsync(request, status));

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateReviewStatusRequest request)
    {
        try { await _reviews.UpdateStatusAsync(id, request.Status); return Ok(new { id }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try { await _reviews.DeleteAsync(id); return Ok(new { message = "Đã xóa." }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
