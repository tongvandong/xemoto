using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

/// <summary>Đánh giá sản phẩm phía khách hàng (storefront): đọc công khai, gửi/sửa khi đã mua.</summary>
[ApiController]
[Route("api")]
public class StorefrontReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;

    public StorefrontReviewsController(IReviewService reviews) => _reviews = reviews;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private int? UserIdOrNull => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [AllowAnonymous]
    [HttpGet("products/{productId:int}/reviews")]
    public async Task<IActionResult> List(int productId) => Ok(new { items = await _reviews.GetProductReviewsAsync(productId) });

    [AllowAnonymous]
    [HttpGet("products/{productId:int}/reviews/summary")]
    public async Task<IActionResult> Summary(int productId) => Ok(await _reviews.GetProductReviewSummaryAsync(productId));

    [Authorize]
    [HttpGet("reviews/product/{productId:int}/me")]
    public async Task<IActionResult> Mine(int productId) => Ok(await _reviews.GetMyReviewStateAsync(productId, UserIdOrNull));

    [Authorize]
    [HttpPost("products/{productId:int}/reviews")]
    public async Task<IActionResult> Create(int productId, CreateReviewRequest request)
    {
        try { return Ok(new { review = await _reviews.CreateProductReviewAsync(productId, CurrentUserId, request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize]
    [HttpPatch("products/{productId:int}/reviews/me")]
    public async Task<IActionResult> UpdateMine(int productId, CreateReviewRequest request)
    {
        try { return Ok(new { review = await _reviews.UpdateMyProductReviewAsync(productId, CurrentUserId, request) }); }
        catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
