using System.Security.Cryptography;
using System.Text;
using MoToSale.Common;
using MoToSale.DTO.Auth;

namespace MoToSale.Services.Identity;

public partial class AuthService
{
    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        string email = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AuthException("Email là bắt buộc.");
        }

        var user = await _users.GetByEmailWithRolesAsync(email);
        if (user == null || user.Status != (int)EntityStatus.Active)
        {
            return new ForgotPasswordResponse("Nếu email tồn tại, hệ thống sẽ tạo liên kết đặt lại mật khẩu.");
        }

        DateTimeOffset expiresAt = DateTimeOffset.UtcNow.AddMinutes(ResetPasswordTokenMinutes);
        string resetToken = CreateResetPasswordToken(email, expiresAt);
        string resetUrl = CreateResetPasswordUrl(email, resetToken);

        return new ForgotPasswordResponse("Đã tạo liên kết đặt lại mật khẩu.", resetToken, resetUrl);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        string email = NormalizeEmail(request.Email);
        ValidateResetPasswordRequest(request, email);

        bool tokenIsValid = ValidateResetPasswordToken(email, request.Token);
        if (!tokenIsValid)
        {
            throw new AuthException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        var user = await _users.GetByEmailWithRolesAsync(email);
        if (user == null)
        {
            throw new AuthException("Tài khoản không tồn tại.");
        }

        user.PasswordHash = _hasher.Hash(request.NewPassword);

        _users.Update(user);
        await _users.SaveChangesAsync();
    }

    private static void ValidateResetPasswordRequest(ResetPasswordRequest request, string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AuthException("Email đặt lại mật khẩu không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new AuthException("Token đặt lại mật khẩu không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new AuthException("Mật khẩu mới là bắt buộc.");
        }

        if (request.NewPassword.Length < 6)
        {
            throw new AuthException("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }
    }

    private static string CreateResetPasswordUrl(string email, string resetToken)
    {
        string safeEmail = Uri.EscapeDataString(email);
        string safeToken = Uri.EscapeDataString(resetToken);

        return $"/forgot-password?email={safeEmail}&token={safeToken}";
    }

    private string CreateResetPasswordToken(string email, DateTimeOffset expiresAt)
    {
        // Token gồm email, thời gian hết hạn và chữ ký HMAC để phát hiện token bị sửa.
        string payload = CreateResetPasswordPayload(email, expiresAt);
        string signature = CreateTokenSignature(payload);
        string tokenText = $"{payload}{ResetPasswordTokenSeparator}{signature}";

        return EncodeBase64Url(Encoding.UTF8.GetBytes(tokenText));
    }

    private static string CreateResetPasswordPayload(string email, DateTimeOffset expiresAt)
    {
        long expiresUnix = expiresAt.ToUnixTimeSeconds();
        return $"{email}{ResetPasswordTokenSeparator}{expiresUnix}";
    }

    private bool ValidateResetPasswordToken(string email, string token)
    {
        string[] tokenParts = ReadResetPasswordToken(token);
        if (tokenParts.Length != 3)
        {
            return false;
        }

        string tokenEmail = tokenParts[0];
        string expiresAtText = tokenParts[1];
        string actualSignature = tokenParts[2];

        if (!string.Equals(tokenEmail, email, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        bool expiresAtIsNumber = long.TryParse(expiresAtText, out long expiresAtUnix);
        if (!expiresAtIsNumber)
        {
            return false;
        }

        long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (nowUnix > expiresAtUnix)
        {
            return false;
        }

        string payload = $"{tokenEmail}{ResetPasswordTokenSeparator}{expiresAtText}";
        string expectedSignature = CreateTokenSignature(payload);

        return AreSignaturesEqual(expectedSignature, actualSignature);
    }

    private static string[] ReadResetPasswordToken(string token)
    {
        try
        {
            byte[] decodedBytes = DecodeBase64Url(token);
            string decodedText = Encoding.UTF8.GetString(decodedBytes);

            return decodedText.Split(ResetPasswordTokenSeparator);
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private string CreateTokenSignature(string payload)
    {
        byte[] secretKeyBytes = Encoding.UTF8.GetBytes(_jwt.SecretKey);
        byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(secretKeyBytes);
        byte[] signatureBytes = hmac.ComputeHash(payloadBytes);

        return EncodeBase64Url(signatureBytes);
    }

    private static bool AreSignaturesEqual(string expectedSignature, string actualSignature)
    {
        byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        byte[] actualBytes = Encoding.UTF8.GetBytes(actualSignature);

        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private static string EncodeBase64Url(byte[] bytes)
    {
        string base64 = Convert.ToBase64String(bytes);
        string withoutPadding = base64.TrimEnd('=');
        string urlSafe = withoutPadding.Replace('+', '-').Replace('/', '_');

        return urlSafe;
    }

    private static byte[] DecodeBase64Url(string value)
    {
        string base64 = value.Replace('-', '+').Replace('_', '/');
        int paddingLength = (4 - base64.Length % 4) % 4;
        string paddedBase64 = base64.PadRight(base64.Length + paddingLength, '=');

        return Convert.FromBase64String(paddedBase64);
    }
}
