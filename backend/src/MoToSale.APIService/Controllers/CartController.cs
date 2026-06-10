using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Ordering;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize]
[Route("api/cart")]
public class CartController : ControllerBase
{
    private readonly IOrderService _orders;

    public CartController(IOrderService orders) => _orders = orders;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _orders.GetCartAsync(CurrentUserId));

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(AddCartItemRequest request)
    {
        try { return Ok(await _orders.AddItemAsync(CurrentUserId, request)); }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("items/{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, UpdateCartItemRequest request)
    {
        try { return Ok(await _orders.UpdateItemAsync(CurrentUserId, id, request)); }
        catch (OrderException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> RemoveItem(int id) => Ok(await _orders.RemoveItemAsync(CurrentUserId, id));
}
