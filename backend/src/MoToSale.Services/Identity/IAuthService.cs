using MoToSale.DTO.Auth;

namespace MoToSale.Services.Identity;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserResponse?> GetProfileAsync(int userId);
}

public class AuthException : Exception
{
    public AuthException(string message) : base(message) { }
}
