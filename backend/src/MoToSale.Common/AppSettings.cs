namespace MoToSale.Common;

/// <summary>Ánh xạ cấu hình JWT từ appsettings.json hoặc biến môi trường.</summary>
public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 480;
}
