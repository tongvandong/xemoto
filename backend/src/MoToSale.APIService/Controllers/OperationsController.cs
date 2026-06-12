using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;
using MoToSale.Services.Settings;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/operations")]
public class OperationsController : ControllerBase
{
    private readonly IStorefrontSettingsService _settings;

    public OperationsController(IStorefrontSettingsService settings)
    {
        _settings = settings;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        List<SettingDto> items = await _settings.GetSettingsAsync();
        return Ok(new ItemsResponse<SettingDto> { Items = items });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] SettingsRequest request)
    {
        await _settings.SaveSettingsAsync(request);
        return Ok(new MessageResponse { Message = "Settings saved successfully." });
    }
}
