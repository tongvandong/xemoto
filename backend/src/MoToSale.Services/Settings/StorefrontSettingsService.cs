using MoToSale.DTO.Operations;
using MoToSale.Entities.SystemConfig;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Settings;

public class StorefrontSettingsService : IStorefrontSettingsService
{
    private readonly IRepository<Setting> _settings;

    public StorefrontSettingsService(IRepository<Setting> settings)
    {
        _settings = settings;
    }

    public async Task<List<SettingDto>> GetSettingsAsync()
    {
        List<Setting> settings = await _settings.GetAllAsync();

        return settings
            .OrderBy(setting => setting.Key)
            .Select(setting => new SettingDto(setting.Key, setting.Value, setting.Description, setting.Description))
            .ToList();
    }

    public async Task SaveSettingsAsync(SettingsRequest request)
    {
        List<Setting> existingSettings = await _settings.GetAllAsync();
        DateTime now = DateTime.UtcNow;

        foreach (SettingItem item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Key))
            {
                continue;
            }

            string key = item.Key.Trim();
            Setting? existing = existingSettings.FirstOrDefault(setting => setting.Key == key);

            if (existing == null)
            {
                AddSetting(item, key, now);
            }
            else
            {
                UpdateSetting(existing, item, now);
                // existing lấy từ GetAllAsync (AsNoTracking) nên EF không theo dõi -> phải Update để thay đổi được lưu.
                _settings.Update(existing);
            }
        }

        await _settings.SaveChangesAsync();
    }

    public async Task<List<StorefrontShowroomDto>> GetShowroomsAsync()
    {
        List<Setting> settings = await _settings.GetAllAsync();
        Dictionary<string, string?> settingMap = settings
            .GroupBy(setting => setting.Key)
            .ToDictionary(group => group.Key, group => group.First().Value);

        string name = PickSetting(settingMap, "StoreName", "ShopName", "CompanyName") ?? "MoToSale";
        string address = PickSetting(settingMap, "StoreAddress", "Address", "CompanyAddress") ?? "120 Nguyễn Trãi, Phường Bến Thành, TP.HCM";
        string province = PickSetting(settingMap, "StoreProvince", "Province", "City") ?? "TP.HCM";

        var store = new StorefrontShowroomDto(
            1,
            name,
            PickSetting(settingMap, "ContactName", "OwnerName", "RepresentativeName") ?? name,
            address,
            PickSetting(settingMap, "StoreDistrict", "District") ?? "Quận 1",
            province,
            province,
            PickSetting(settingMap, "StorePhone", "Phone", "Hotline") ?? "0900000003",
            PickSetting(settingMap, "ZaloPhone", "Zalo", "StorePhone", "Phone", "Hotline") ?? "0900000003",
            PickSetting(settingMap, "StoreEmail", "Email") ?? "support@motosale.local",
            PickSetting(settingMap, "OpeningHours", "StoreHours") ?? "08:00 - 21:00",
            PickSetting(settingMap, "FacebookUrl", "Facebook") ?? string.Empty,
            PickSetting(settingMap, "MessengerUrl", "Messenger") ?? string.Empty,
            PickSetting(settingMap, "YoutubeUrl", "YouTube", "Youtube") ?? string.Empty,
            PickSetting(settingMap, "BankName") ?? string.Empty,
            PickSetting(settingMap, "BankCode", "BankBin") ?? string.Empty,
            PickSetting(settingMap, "BankAccountNo", "BankAccount") ?? string.Empty,
            PickSetting(settingMap, "BankAccountName", "StoreName") ?? string.Empty,
            PickSetting(settingMap, "BankQrUrl") ?? string.Empty,
            ParseDecimalSetting(settingMap, "DefaultShippingFee"),
            true);

        return new List<StorefrontShowroomDto> { store };
    }

    private void AddSetting(SettingItem item, string key, DateTime now)
    {
        var setting = new Setting
        {
            Key = key,
            Value = item.Value,
            Description = item.ResolvedDescription,
            CreatedDate = now
        };

        _settings.Add(setting);
    }

    private static void UpdateSetting(Setting setting, SettingItem item, DateTime now)
    {
        setting.Value = item.Value;
        setting.Description = item.ResolvedDescription;
        setting.UpdatedDate = now;
    }

    // Setting lưu dạng chuỗi; admin có thể nhập "30000" hoặc "30.000" nên bỏ dấu phân tách trước khi parse.
    private static decimal ParseDecimalSetting(Dictionary<string, string?> settingMap, params string[] keys)
    {
        string? raw = PickSetting(settingMap, keys);

        if (string.IsNullOrWhiteSpace(raw))
        {
            return 0;
        }

        string cleaned = raw.Replace(".", string.Empty).Replace(",", string.Empty).Replace(" ", string.Empty);

        if (decimal.TryParse(cleaned, out decimal value) && value >= 0)
        {
            return value;
        }

        return 0;
    }

    private static string? PickSetting(Dictionary<string, string?> settingMap, params string[] keys)
    {
        foreach (string key in keys)
        {
            bool exists = settingMap.TryGetValue(key, out string? value);

            if (exists && !string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }
}
