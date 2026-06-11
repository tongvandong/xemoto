using MoToSale.DTO.Operations;

namespace MoToSale.Services.Settings;

public interface IStorefrontSettingsService
{
    Task<List<SettingDto>> GetSettingsAsync();

    Task SaveSettingsAsync(SettingsRequest request);

    Task<List<StorefrontShowroomDto>> GetShowroomsAsync();
}
