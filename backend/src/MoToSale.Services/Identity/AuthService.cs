using System.Security.Cryptography;
using System.Text;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Common.Helpers;
using MoToSale.DTO.Auth;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenHelper _token;
    private readonly JwtSettings _jwt;

    public AuthService(IUserRepository users, IPasswordHasher hasher, ITokenHelper token, JwtSettings jwt)
    {
        _users = users;
        _hasher = hasher;
        _token = token;
        _jwt = jwt;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new AuthException("Email và mật khẩu là bắt buộc.");
        }

        if (await _users.EmailExistsAsync(email))
        {
            throw new AuthException("Email đã được sử dụng.");
        }

        var fullName = (request.FullName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(fullName)) throw new AuthException("Họ tên là bắt buộc.");
        if (fullName.Length > 150) throw new AuthException("Họ tên không được vượt quá 150 ký tự.");
        if (email.Length > 255) throw new AuthException("Email không được vượt quá 255 ký tự.");
        var phone = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        if (phone != null && phone.Length > 20) throw new AuthException("Số điện thoại không hợp lệ (tối đa 20 ký tự).");

        var role = await _users.GetRoleByCodeAsync(RoleConstant.Customer);
        var user = new User
        {
            FullName = fullName,
            Email = email,
            PhoneNumber = phone,
            PasswordHash = _hasher.Hash(request.Password),
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
            UserRoles = { new UserRole { RoleId = role.Id } },
        };

        _users.Add(user);
        await _users.SaveChangesAsync();

        return BuildAuthResponse(user, new[] { RoleConstant.Customer });
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailWithRolesAsync(email);

        if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AuthException("Email hoặc mật khẩu không đúng.");
        }

        if (user.Status != (int)EntityStatus.Active)
        {
            throw new AuthException("Tài khoản đã bị khóa.");
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Code).ToArray();
        return BuildAuthResponse(user, roles);
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AuthException("Email là bắt buộc.");
        }

        var user = await _users.GetByEmailWithRolesAsync(email);
        if (user is null || user.Status != (int)EntityStatus.Active)
        {
            return new ForgotPasswordResponse("Nếu email tồn tại, hệ thống sẽ tạo liên kết đặt lại mật khẩu.");
        }

        var token = CreateResetToken(email, DateTimeOffset.UtcNow.AddMinutes(30));
        var resetUrl = $"/forgot-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        return new ForgotPasswordResponse("Đã tạo liên kết đặt lại mật khẩu.", token, resetUrl);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Token))
        {
            throw new AuthException("Thông tin đặt lại mật khẩu không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            throw new AuthException("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }

        if (!ValidateResetToken(email, request.Token))
        {
            throw new AuthException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        var user = await _users.GetByEmailWithRolesAsync(email)
            ?? throw new AuthException("Tài khoản không tồn tại.");

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        _users.Update(user);
        await _users.SaveChangesAsync();
    }

    public async Task<UserResponse?> GetProfileAsync(int userId)
    {
        var user = await _users.GetByIdWithRolesAsync(userId);
        return user is null
            ? null
            : new UserResponse(user.Id, user.FullName, user.Email, user.PhoneNumber, user.UserRoles.Select(ur => ur.Role.Code));
    }

    private AuthResponse BuildAuthResponse(User user, IEnumerable<string> roles)
    {
        var roleList = roles.ToArray();
        var (token, expiresAt) = _token.CreateToken(user.Id, user.FullName, user.Email, roleList);
        return new AuthResponse(token, expiresAt, new UserResponse(user.Id, user.FullName, user.Email, user.PhoneNumber, roleList));
    }

    private string CreateResetToken(string email, DateTimeOffset expiresAt)
    {
        var expiresUnix = expiresAt.ToUnixTimeSeconds();
        var payload = $"{email}|{expiresUnix}";
        var signature = Sign(payload);
        return Base64UrlEncode(Encoding.UTF8.GetBytes($"{payload}|{signature}"));
    }

    private bool ValidateResetToken(string email, string token)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Base64UrlDecode(token));
            var parts = decoded.Split('|');
            if (parts.Length != 3) return false;
            if (!string.Equals(parts[0], email, StringComparison.OrdinalIgnoreCase)) return false;
            if (!long.TryParse(parts[1], out var expiresUnix)) return false;
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresUnix) return false;

            var payload = $"{parts[0]}|{parts[1]}";
            var expected = Sign(payload);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(parts[2]));
        }
        catch
        {
            return false;
        }
    }

    private string Sign(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }
}
