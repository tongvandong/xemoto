using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;
public partial class UserManagementService
{
    public async Task<int> CreateUserAsync(CreateUserRequest request, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
        {
            throw new UserManagementException("Họ tên và Email là bắt buộc.");
        }

        string? normalizedRole = NormalizeInternalRole(request.Role);
        if (normalizedRole == null)
        {
            throw new UserManagementException("Trang tài khoản hệ thống chỉ được tạo Admin hoặc Staff.");
        }

        if (normalizedRole == RoleConstant.Admin && await _users.AnyUserInRoleAsync(RoleConstant.Admin, status: (int)EntityStatus.Active))
        {
            throw new UserManagementException("Hệ thống chỉ duy trì một tài khoản Admin hoạt động.");
        }

        string email = request.Email.Trim().ToLowerInvariant();
        if (await _users.EmailExistsAsync(email))
        {
            throw new UserManagementException("Email đã được sử dụng.");
        }

        Role role = await _users.GetRoleByCodeAsync(normalizedRole);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = ValidateAndNormalizePhone(request.PhoneNumber),
            PasswordHash = _hasher.Hash(GetPasswordOrDefault(request.Password)),
            Status = (int)EntityStatus.Active,
            CreatedDate = DateTime.UtcNow,
            UserRoles = { new UserRole { RoleId = role.Id } }
        };

        _users.Add(user);
        await _users.SaveChangesAsync();

        return user.Id;
    }

    public async Task UpdateUserAsync(int id, AdminUpdateUserRequest request, int currentUserId)
    {
        User user = await GetUserOrThrowAsync(id);

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new UserManagementException("Họ tên là bắt buộc.");
        }

        string? normalizedRole = NormalizeInternalRole(request.Role);
        if (normalizedRole == null)
        {
            throw new UserManagementException("Trang tài khoản hệ thống chỉ được dùng vai trò Admin hoặc Staff.");
        }

        int nextStatus = NormalizeEntityStatus(request.Status);
        await EnsureAdminCanBeChangedAsync(user, id, currentUserId, normalizedRole, nextStatus);

        Role role = await _users.GetRoleByCodeAsync(normalizedRole);

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = ValidateAndNormalizePhone(request.PhoneNumber);
        user.Status = nextStatus;
        user.UserRoles.Clear();
        user.UserRoles.Add(new UserRole { RoleId = role.Id });
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }

    public async Task SetStatusAsync(int id, UpdateStatusRequest request, int currentUserId)
    {
        User user = await GetUserOrThrowAsync(id);
        int nextStatus = NormalizeEntityStatus(request.Status);

        if (id == currentUserId && nextStatus != (int)EntityStatus.Active)
        {
            throw new UserManagementException("Không thể tự khóa tài khoản đang đăng nhập.");
        }

        if (HasRole(user, RoleConstant.Admin)
            && nextStatus != (int)EntityStatus.Active
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
        {
            throw new UserManagementException("Không thể khóa Admin hoạt động cuối cùng.");
        }

        user.Status = nextStatus;
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id, int currentUserId)
    {
        User user = await GetUserOrThrowAsync(id);

        if (id == currentUserId)
        {
            throw new UserManagementException("Không thể xóa tài khoản đang đăng nhập.");
        }

        if (HasRole(user, RoleConstant.Admin)
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
        {
            throw new UserManagementException("Không thể xóa Admin hoạt động cuối cùng.");
        }

        user.Status = (int)EntityStatus.Inactive;
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }
}
