using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Catalog;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

/// <summary>Đánh giá sản phẩm phía khách hàng.</summary>
[ApiController]
[Route("api")]
public class StorefrontReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;

    public StorefrontReviewsController(IReviewService reviews)
    {
        _reviews = reviews;
    }

    private int CurrentUserId
    {
        get
        {
            string? rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(rawUserId!);
        }
    }

    private int? UserIdOrNull
    {
        get
        {
            string? rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            bool parsed = int.TryParse(rawUserId, out int userId);

            return parsed ? userId : null;
        }
    }

    [AllowAnonymous]
    [HttpGet("products/{productId:int}/reviews")]
    public async Task<IActionResult> List(int productId)
    {
        List<ProductReviewItem> items = await _reviews.GetProductReviewsAsync(productId);
        return Ok(new ItemsResponse<ProductReviewItem> { Items = items });
    }

    [AllowAnonymous]
    [HttpGet("products/{productId:int}/reviews/summary")]
    public async Task<IActionResult> Summary(int productId)
    {
        var summary = await _reviews.GetProductReviewSummaryAsync(productId);
        return Ok(summary);
    }

    [Authorize]
    [HttpGet("reviews/product/{productId:int}/me")]
    public async Task<IActionResult> Mine(int productId)
    {
        var result = await _reviews.GetMyReviewStateAsync(productId, UserIdOrNull);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("products/{productId:int}/reviews")]
    public async Task<IActionResult> Create(int productId, CreateReviewRequest request)
    {
        try
        {
            ProductReviewItem review = await _reviews.CreateProductReviewAsync(productId, CurrentUserId, request);
            return Ok(new ProductReviewResponse { Review = review });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize]
    [HttpPatch("products/{productId:int}/reviews/me")]
    public async Task<IActionResult> UpdateMine(int productId, CreateReviewRequest request)
    {
        try
        {
            ProductReviewItem review = await _reviews.UpdateMyProductReviewAsync(productId, CurrentUserId, request);
            return Ok(new ProductReviewResponse { Review = review });
        }
        catch (CatalogException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}
