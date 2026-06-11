using Microsoft.AspNetCore.Mvc;
using MoToSale.Services.Settings;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/showrooms")]
public class ShowroomsController : ControllerBase
{
    private readonly IStorefrontSettingsService _settings;

    public ShowroomsController(IStorefrontSettingsService settings)
    {
        _settings = settings;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var showrooms = await _settings.GetShowroomsAsync();
        return Ok(showrooms);
    }
}
