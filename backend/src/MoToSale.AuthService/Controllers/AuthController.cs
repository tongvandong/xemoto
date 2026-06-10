using Microsoft.AspNetCore.Mvc;
using MoToSale.DTO.Auth;
using MoToSale.Services.Identity;

namespace MoToSale.AuthService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try { return Ok(await _auth.RegisterAsync(request)); }
        catch (AuthException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try { return Ok(await _auth.LoginAsync(request)); }
        catch (AuthException ex) { return Unauthorized(new { message = ex.Message }); }
    }
}
