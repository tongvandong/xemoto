namespace MoToSale.DTO.Auth;

public record RegisterRequest(string FullName, string Email, string? PhoneNumber, string Password);

public record LoginRequest(string Email, string Password);

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ForgotPasswordResponse
{
    public ForgotPasswordResponse()
    {
    }

    public ForgotPasswordResponse(string message, string? resetToken = null, string? resetUrl = null)
    {
        Message = message;
        ResetToken = resetToken;
        ResetUrl = resetUrl;
    }

    public string Message { get; set; } = string.Empty;
    public string? ResetToken { get; set; }
    public string? ResetUrl { get; set; }
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public record AuthResponse(string Token, DateTime ExpiresAt, UserResponse User);

public record UserResponse(int Id, string FullName, string Email, string? PhoneNumber, IEnumerable<string> Roles);

public record UpdateProfileRequest(string FullName, string? PhoneNumber);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AddressRequest(string RecipientName, string Phone, string Line, string? Ward, string? District, string? Province, bool IsDefault);

public record CustomerDto(int Id, string FullName, string Email, string? PhoneNumber, int Status, string? CareNote, DateTime CreatedDate);
public record CareNoteRequest(string? CareNote);
public record CustomerUpsertRequest(string FullName, string? Email, string? PhoneNumber, int Status, string? CareNote);

public record CreateUserRequest(string FullName, string Email, string? PhoneNumber, string Password, string Role);
public record AdminUpdateUserRequest(string FullName, string? PhoneNumber, string Role, int Status);
public record UpdateStatusRequest(int Status);

public class AddressDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line { get; set; } = string.Empty;
    public string? Ward { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public bool IsDefault { get; set; }
    public int Status { get; set; }
}

public class UserListItemDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int Status { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
    public DateTime CreatedDate { get; set; }
}

public class UserDetailDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int Status { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
    public string? CareNote { get; set; }
    public DateTime CreatedDate { get; set; }
}
