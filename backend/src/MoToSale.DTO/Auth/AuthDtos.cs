namespace MoToSale.DTO.Auth;

public record RegisterRequest(string FullName, string Email, string? PhoneNumber, string Password);

public record LoginRequest(string Email, string Password);

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
