using MoToSale.DTO.Auth;

namespace MoToSale.Services.Identity;

public partial class AuthService
{
    public async Task<UserResponse?> GetProfileAsync(int userId)
    {
        var user = await _users.GetByIdWithRolesAsync(userId);
        if (user == null)
        {
            return null;
        }

        string[] roles = user.UserRoles
            .Select(userRole => userRole.Role.Code)
            .ToArray();

        return new UserResponse(user.Id, user.FullName, user.Email, user.PhoneNumber, roles);
    }
}
