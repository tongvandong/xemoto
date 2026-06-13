using System.Text.Json.Serialization;

namespace MoToSale.DTO.Operations;

public class SettingsRequest
{
    public List<SettingItem> Items { get; set; } = new();
}

public class SettingItem
{
    public string Key { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string? Description { get; set; }

    [JsonPropertyName("moTa")]
    public string? LegacyDescription { get; set; }

    [JsonIgnore]
    public string? ResolvedDescription
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(Description))
            {
                return Description;
            }

            return LegacyDescription;
        }
    }
}

public record SettingDto(string Key, string? Value, string? Description, string? MoTa);

public record StorefrontShowroomDto(
    int Id,
    string Name,
    string ContactName,
    string Address,
    string District,
    string Province,
    string City,
    string PhoneNumber,
    string ZaloPhone,
    string Email,
    string OpeningHours,
    string FacebookUrl,
    string MessengerUrl,
    string YoutubeUrl,
    string BankName,
    string BankCode,
    string BankAccountNo,
    string BankAccountName,
    string BankQrUrl,
    decimal DefaultShippingFee,
    bool IsActive);
