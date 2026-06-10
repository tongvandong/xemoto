using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using MoToSale.Common.Auth;
using MoToSale.Entities.SystemConfig;
using MoToSale.Repository.EFCore;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/operations")]
public class OperationsController : ControllerBase
{
    private readonly IRepository<Setting> _settings;

    public OperationsController(IRepository<Setting> settings)
    {
        _settings = settings;
    }

    // ===== System settings (key-value) =====
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var list = await _settings.GetAllAsync();
        var items = list.OrderBy(s => s.Key).Select(s => new { key = s.Key, value = s.Value, description = s.Description, moTa = s.Description });
        return Ok(new { items });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] SettingsRequest request)
    {
        var all = await _settings.GetAllAsync();
        foreach (var item in request.Items ?? new())
        {
            if (string.IsNullOrWhiteSpace(item.Key)) continue;
            var existing = all.FirstOrDefault(s => s.Key == item.Key.Trim());
            if (existing is null)
            {
                _settings.Add(new Setting { Key = item.Key.Trim(), Value = item.Value, Description = item.ResolvedDescription, CreatedDate = DateTime.UtcNow });
            }
            else
            {
                existing.Value = item.Value; existing.Description = item.ResolvedDescription; existing.UpdatedDate = DateTime.UtcNow;
                _settings.Update(existing);
            }
        }
        await _settings.SaveChangesAsync();
        return Ok(new { message = "Settings saved successfully." });
    }
}

public class SettingsRequest { public List<SettingItem> Items { get; set; } = new(); }
public class SettingItem
{
    public string Key { get; set; } = "";
    public string? Value { get; set; }
    public string? Description { get; set; }

    [JsonPropertyName("moTa")]
    public string? LegacyDescription { get; set; }

    [JsonIgnore]
    public string? ResolvedDescription => Description ?? LegacyDescription;
}
