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

    public CartController(IOrderService orders)
    {
        _orders = orders;
    }

    private int CurrentUserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(userIdText!);
        }
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var cart = await _orders.GetCartAsync(CurrentUserId);
        return Ok(cart);
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(AddCartItemRequest request)
    {
        try
        {
            var cart = await _orders.AddItemAsync(CurrentUserId, request);
            return Ok(cart);
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPut("items/{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, UpdateCartItemRequest request)
    {
        try
        {
            var cart = await _orders.UpdateItemAsync(CurrentUserId, id, request);
            return Ok(cart);
        }
        catch (OrderException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> RemoveItem(int id)
    {
        var cart = await _orders.RemoveItemAsync(CurrentUserId, id);
        return Ok(cart);
    }
}
