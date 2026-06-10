using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Services.Catalog;

namespace MoToSale.APIService.Controllers;

/// <summary>Sản phẩm yêu thích của khách hàng (storefront).</summary>
[ApiController]
[Authorize]
[Route("api/favorites")]
public class FavoritesController : ControllerBase
{
    private readonly IFavoriteService _favorites;

    public FavoritesController(IFavoriteService favorites) => _favorites = favorites;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Mine() => Ok(new { items = await _favorites.GetMineAsync(CurrentUserId) });

    [HttpPost("{productId:int}")]
    public async Task<IActionResult> Add(int productId) => Ok(await _favorites.AddAsync(CurrentUserId, productId));

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> Remove(int productId)
    {
        await _favorites.RemoveAsync(CurrentUserId, productId);
        return Ok(new { message = "Đã bỏ yêu thích." });
    }
}
