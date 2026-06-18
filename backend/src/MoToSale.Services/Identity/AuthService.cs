using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;

public partial class AuthService : IAuthService
{
    private const int ResetPasswordTokenMinutes = 30;
    private const char ResetPasswordTokenSeparator = '|';

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
        string email = NormalizeEmail(request.Email);
        ValidateRegisterRequest(request, email);

        bool emailAlreadyExists = await _users.EmailExistsAsync(email);
        if (emailAlreadyExists)
        {
            throw new AuthException("Email đã được sử dụng.");
        }

        string fullName = request.FullName.Trim();
        string? phoneNumber = NormalizePhoneNumber(request.PhoneNumber);
        var customerRole = await _users.GetRoleByCodeAsync(RoleConstant.Customer);

        var user = CreateCustomerUser(request.Password, email, fullName, phoneNumber, customerRole.Id);

        _users.Add(user);
        await _users.SaveChangesAsync();

        var roles = new[] { RoleConstant.Customer };
        return BuildAuthResponse(user, roles);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        string email = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AuthException("Email hoặc mật khẩu không đúng.");
        }

        var user = await _users.GetByEmailWithRolesAsync(email);
        if (user == null)
        {
            throw new AuthException("Email hoặc mật khẩu không đúng.");
        }

        bool isPasswordCorrect = _hasher.Verify(request.Password, user.PasswordHash);
        if (!isPasswordCorrect)
        {
            throw new AuthException("Email hoặc mật khẩu không đúng.");
        }

        if (user.Status != (int)EntityStatus.Active)
        {
            throw new AuthException("Tài khoản đã bị khóa.");
        }

        string[] roles = user.UserRoles
            .Select(userRole => userRole.Role.Code)
            .ToArray();

        return BuildAuthResponse(user, roles);
    }

    private static string NormalizeEmail(string? email)
    {
        if (email == null)
        {
            return string.Empty;
        }

        return email.Trim().ToLowerInvariant();
    }

    private static string? NormalizePhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return null;
        }

        // Chuẩn hoá: đổi +84 -> 0, bỏ ký tự ngăn cách (việc kiểm tra định dạng làm ở ValidateRegisterRequest).
        return PhoneNumberRule.Normalize(phoneNumber);
    }

    private static void ValidateRegisterRequest(RegisterRequest request, string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new AuthException("Email là bắt buộc.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new AuthException("Mật khẩu là bắt buộc.");
        }

        string fullName = request.FullName.Trim();
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new AuthException("Họ tên là bắt buộc.");
        }

        if (fullName.Length > 150)
        {
            throw new AuthException("Họ tên không được vượt quá 150 ký tự.");
        }

        if (email.Length > 255)
        {
            throw new AuthException("Email không được vượt quá 255 ký tự.");
        }

        string? phoneNumber = NormalizePhoneNumber(request.PhoneNumber);
        if (phoneNumber != null && !PhoneNumberRule.IsValid(phoneNumber))
        {
            throw new AuthException("Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và gồm 10–11 chữ số).");
        }
    }

    private User CreateCustomerUser(string password, string email, string fullName, string? phoneNumber, int roleId)
    {
        var user = new User
        {
            FullName = fullName,
            Email = email,
            PhoneNumber = phoneNumber,
            PasswordHash = _hasher.Hash(password),
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        user.UserRoles.Add(new UserRole
        {
            RoleId = roleId,
        });

        return user;
    }

    private AuthResponse BuildAuthResponse(User user, IEnumerable<string> roles)
    {
        string[] roleList = roles.ToArray();
        var tokenResult = _token.CreateToken(user.Id, user.FullName, user.Email, roleList);

        string accessToken = tokenResult.Token;
        DateTime expiresAt = tokenResult.ExpiresAt;

        var userResponse = new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            roleList);

        return new AuthResponse(accessToken, expiresAt, userResponse);
    }
}
