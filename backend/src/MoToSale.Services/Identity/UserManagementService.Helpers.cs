using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;
public partial class UserManagementService
{
    private static AddressDto MapAddress(Address address)
    {
        return new AddressDto
        {
            Id = address.Id,
            UserId = address.UserId,
            RecipientName = address.RecipientName,
            Phone = address.Phone,
            Line = address.Line,
            Ward = address.Ward,
            District = address.District,
            Province = address.Province,
            IsDefault = address.IsDefault,
            Status = address.Status
        };
    }

    private static UserListItemDto MapUserListItem(User user)
    {
        return new UserListItemDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Status = user.Status,
            Roles = user.UserRoles.Select(userRole => userRole.Role.Code).ToList(),
            CreatedDate = user.CreatedDate
        };
    }

    private static CustomerDto MapCustomer(User user, CustomerOrderStatsDto? stats = null)
    {
        return new CustomerDto(
            user.Id,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.Status,
            user.CareNote,
            user.CreatedDate,
            stats?.TotalOrders ?? 0,
            stats?.TotalSpent ?? 0,
            stats?.CancelledOrders ?? 0,
            stats?.LastOrderAt);
    }

    private static UserDetailDto MapUserDetail(User user)
    {
        return new UserDetailDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Status = user.Status,
            Roles = user.UserRoles.Select(userRole => userRole.Role.Code).ToList(),
            CareNote = user.CareNote,
            CreatedDate = user.CreatedDate
        };
    }

    private async Task<User> GetUserOrThrowAsync(int id)
    {
        User? user = await _users.GetByIdWithRolesAsync(id);

        if (user == null)
        {
            throw new UserManagementException("Không tìm thấy người dùng.");
        }

        return user;
    }

    private async Task<User> GetCustomerOrThrowAsync(int id)
    {
        User user = await GetUserOrThrowAsync(id);

        if (!HasRole(user, RoleConstant.Customer))
        {
            throw new UserManagementException("Không tìm thấy khách hàng.");
        }

        return user;
    }

    private async Task EnsureAdminCanBeChangedAsync(User user, int id, int currentUserId, string normalizedRole, int nextStatus)
    {
        bool isSelf = id == currentUserId;
        bool isAdmin = HasRole(user, RoleConstant.Admin);

        if (isSelf && (normalizedRole != RoleConstant.Admin || nextStatus != (int)EntityStatus.Active))
        {
            throw new UserManagementException("Không thể tự khóa hoặc tự hạ quyền tài khoản Admin đang đăng nhập.");
        }

        if (isAdmin
            && (normalizedRole != RoleConstant.Admin || nextStatus != (int)EntityStatus.Active)
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
        {
            throw new UserManagementException("Không thể khóa hoặc hạ quyền Admin hoạt động cuối cùng.");
        }
    }

    private static string ValidateAndNormalizeFullName(string? fullName)
    {
        string normalized = (fullName ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new UserManagementException("Họ tên là bắt buộc.");
        }

        if (normalized.Length > 150)
        {
            throw new UserManagementException("Họ tên không được vượt quá 150 ký tự.");
        }

        return normalized;
    }

    // Số điện thoại không bắt buộc; nếu có nhập thì phải đúng định dạng VN.
    // Trả về số đã chuẩn hoá (đổi +84 -> 0, bỏ ký tự ngăn cách) để lưu cho thống nhất.
    private static string? ValidateAndNormalizePhone(string? phoneNumber)
    {
        string? phone = NormalizeOptionalText(phoneNumber);
        if (phone == null)
        {
            return null;
        }

        if (!PhoneNumberRule.IsValid(phone))
        {
            throw new UserManagementException("Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và gồm 10–11 chữ số).");
        }

        return PhoneNumberRule.Normalize(phone);
    }

    private static void ValidateCustomerName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new UserManagementException("Tên khách hàng là bắt buộc.");
        }
    }

    private static void ApplySearchKeyword(PagingRequest request, string? search)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            request.Keyword = search.Trim();
        }
    }

    private static bool HasRole(User user, string role)
    {
        return user.UserRoles.Any(userRole => userRole.Role.Code == role);
    }

    private static string? NormalizeInternalRole(string? role)
    {
        switch (role)
        {
            case RoleConstant.Admin:
                return RoleConstant.Admin;
            case RoleConstant.Staff:
                return RoleConstant.Staff;
            default:
                return null;
        }
    }

    private static int NormalizeEntityStatus(int status)
    {
        switch (status)
        {
            case (int)EntityStatus.Deleted:
                return (int)EntityStatus.Deleted;
            case (int)EntityStatus.Inactive:
                return (int)EntityStatus.Inactive;
            default:
                return (int)EntityStatus.Active;
        }
    }

    private static int? ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        if (int.TryParse(status, out int numeric))
        {
            return NormalizeEntityStatus(numeric);
        }

        switch (status.Trim())
        {
            case "Active":
                return (int)EntityStatus.Active;
            case "Inactive":
                return (int)EntityStatus.Inactive;
            case "Deleted":
            case "Locked":
                return (int)EntityStatus.Deleted;
            default:
                return null;
        }
    }

    private async Task<string> BuildCustomerEmailAsync(string? email, string? phoneNumber, int? currentUserId = null)
    {
        if (!string.IsNullOrWhiteSpace(email))
        {
            string normalized = email.Trim().ToLowerInvariant();
            User? existing = await _users.GetByEmailWithRolesAsync(normalized);

            if (existing != null && existing.Id != currentUserId)
            {
                throw new UserManagementException("Email đã được sử dụng.");
            }

            return normalized;
        }

        string token = NormalizeEmailToken(phoneNumber);
        string generated = $"customer-{token}@motosale.local";
        User? conflict = await _users.GetByEmailWithRolesAsync(generated);

        if (conflict == null || conflict.Id == currentUserId)
        {
            return generated;
        }

        return $"customer-{Guid.NewGuid():N}@motosale.local";
    }

    private static string NormalizeEmailToken(string? value)
    {
        string rawValue = value ?? string.Empty;
        char[] tokenCharacters = rawValue.Where(char.IsLetterOrDigit).ToArray();
        string token = new string(tokenCharacters).ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(token))
        {
            return token;
        }

        return Guid.NewGuid().ToString("N")[..12];
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string GetPasswordOrDefault(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Changeme@123";
        }

        return password;
    }
}
