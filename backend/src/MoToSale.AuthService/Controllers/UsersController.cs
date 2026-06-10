using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Common.Helpers;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using MoToSale.Repository;
using MoToSale.Repository.Identity;
using MoToSale.Services.Identity;

namespace MoToSale.AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IAddressRepository _addresses;
    private readonly IAuthService _auth;
    private readonly IPasswordHasher _hasher;
    private readonly AppDbContext _db;

    public UsersController(IUserRepository users, IAddressRepository addresses, IAuthService auth, IPasswordHasher hasher, AppDbContext db)
    {
        _users = users;
        _addresses = addresses;
        _auth = auth;
        _hasher = hasher;
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var profile = await _auth.GetProfileAsync(CurrentUserId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await _users.GetByIdWithRolesAsync(CurrentUserId);
        if (user is null) return NotFound();

        var fullName = (request.FullName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(fullName)) return BadRequest(new { message = "Họ tên là bắt buộc." });
        if (fullName.Length > 150) return BadRequest(new { message = "Họ tên không được vượt quá 150 ký tự." });
        var phone = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        if (phone != null && phone.Length > 20) return BadRequest(new { message = "Số điện thoại không hợp lệ (tối đa 20 ký tự)." });

        user.FullName = fullName;
        user.PhoneNumber = phone;
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();

        return Ok(await _auth.GetProfileAsync(CurrentUserId));
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await _users.GetByIdWithRolesAsync(CurrentUserId);
        if (user is null) return NotFound();

        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        }

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { message = "Đổi mật khẩu thành công." });
    }

    [HttpGet("me/addresses")]
    public async Task<IActionResult> GetAddresses() => Ok(new { items = await _addresses.GetByUserAsync(CurrentUserId) });

    [HttpPost("me/addresses")]
    public async Task<IActionResult> AddAddress(AddressRequest request)
    {
        if (request.IsDefault)
        {
            await _addresses.ClearDefaultAsync(CurrentUserId);
        }

        var address = new Address
        {
            UserId = CurrentUserId,
            RecipientName = request.RecipientName.Trim(),
            Phone = request.Phone.Trim(),
            Line = request.Line.Trim(),
            Ward = request.Ward?.Trim(),
            District = request.District?.Trim(),
            Province = request.Province?.Trim(),
            IsDefault = request.IsDefault,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        _addresses.Add(address);
        await _addresses.SaveChangesAsync();
        return Ok(new { id = address.Id });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status)
    {
        request.Keyword = string.IsNullOrWhiteSpace(search) ? request.Keyword : search.Trim();
        var page = await _users.SearchAsync(request, NormalizeInternalRole(role), ParseStatus(status));
        var result = new PagingResponse<object>
        {
            Items = page.Items.Select(u => (object)new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Status,
                roles = u.UserRoles.Select(ur => ur.Role.Code),
                u.CreatedDate,
            }).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        };
        return Ok(result);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? status)
    {
        request.Keyword = string.IsNullOrWhiteSpace(search) ? request.Keyword : search.Trim();
        var page = await _users.SearchCustomersAsync(request, ParseStatus(status));
        return Ok(new PagingResponse<object>
        {
            Items = page.Items.Select(u => (object)new CustomerDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Status, u.CareNote, u.CreatedDate)).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        });
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer(CustomerUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Tên khách hàng là bắt buộc." });

        string email;
        try
        {
            email = await BuildCustomerEmailAsync(request.Email, request.PhoneNumber);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        var role = await _users.GetRoleByCodeAsync(RoleConstant.Customer);
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            CareNote = string.IsNullOrWhiteSpace(request.CareNote) ? null : request.CareNote.Trim(),
            PasswordHash = _hasher.Hash($"{Guid.NewGuid():N}@Customer1"),
            Status = NormalizeEntityStatus(request.Status),
            CreatedDate = DateTime.UtcNow,
            UserRoles = { new UserRole { RoleId = role.Id } },
        };

        _users.Add(user);
        await _users.SaveChangesAsync();
        return Ok(new { id = user.Id });
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("customers/{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, CustomerUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Tên khách hàng là bắt buộc." });

        var user = await _users.GetByIdWithRolesAsync(id);
        if (user is null || !HasRole(user, RoleConstant.Customer)) return NotFound();

        string email;
        try
        {
            email = await BuildCustomerEmailAsync(request.Email, request.PhoneNumber, id);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        user.CareNote = string.IsNullOrWhiteSpace(request.CareNote) ? null : request.CareNote.Trim();
        user.Status = NormalizeEntityStatus(request.Status);
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { id });
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPatch("customers/{id:int}/care-note")]
    public async Task<IActionResult> UpdateCareNote(int id, CareNoteRequest request)
    {
        var user = await _users.GetByIdWithRolesAsync(id);
        if (user is null || !HasRole(user, RoleConstant.Customer)) return NotFound();

        user.CareNote = request.CareNote;
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { id });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet("all")]
    public Task<IActionResult> All([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status) =>
        List(request, search, role, status);

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await _users.GetByIdWithRolesAsync(id);
        if (u is null) return NotFound();

        return Ok(new
        {
            u.Id,
            u.FullName,
            u.Email,
            u.PhoneNumber,
            u.Status,
            roles = u.UserRoles.Select(ur => ur.Role.Code),
            u.CareNote,
            u.CreatedDate,
        });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Họ tên và Email là bắt buộc." });

        var normalizedRole = NormalizeInternalRole(request.Role);
        if (normalizedRole is null)
            return BadRequest(new { message = "Trang tài khoản hệ thống chỉ được tạo Admin hoặc Staff." });

        if (normalizedRole == RoleConstant.Admin && await _users.AnyUserInRoleAsync(RoleConstant.Admin, status: (int)EntityStatus.Active))
            return BadRequest(new { message = "Hệ thống chỉ duy trì một tài khoản Admin hoạt động." });

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _users.EmailExistsAsync(email)) return BadRequest(new { message = "Email đã được sử dụng." });

        var role = await _users.GetRoleByCodeAsync(normalizedRole);
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            PasswordHash = _hasher.Hash(string.IsNullOrWhiteSpace(request.Password) ? "Changeme@123" : request.Password),
            Status = (int)EntityStatus.Active,
            CreatedDate = DateTime.UtcNow,
            UserRoles = { new UserRole { RoleId = role.Id } },
        };

        _users.Add(user);
        await _users.SaveChangesAsync();
        return Ok(new { id = user.Id });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AdminUpdateUserRequest request)
    {
        var user = await _users.GetByIdWithRolesAsync(id);
        if (user is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ tên là bắt buộc." });

        var normalizedRole = NormalizeInternalRole(request.Role);
        if (normalizedRole is null)
            return BadRequest(new { message = "Trang tài khoản hệ thống chỉ được dùng vai trò Admin hoặc Staff." });

        var nextStatus = NormalizeEntityStatus(request.Status);
        var isSelf = id == CurrentUserId;
        var isAdmin = HasRole(user, RoleConstant.Admin);

        if (isSelf && (normalizedRole != RoleConstant.Admin || nextStatus != (int)EntityStatus.Active))
            return BadRequest(new { message = "Không thể tự khóa hoặc tự hạ quyền tài khoản Admin đang đăng nhập." });

        if (isAdmin
            && (normalizedRole != RoleConstant.Admin || nextStatus != (int)EntityStatus.Active)
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
            return BadRequest(new { message = "Không thể khóa hoặc hạ quyền Admin hoạt động cuối cùng." });

        var role = await _users.GetRoleByCodeAsync(normalizedRole);
        user.FullName = request.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        user.Status = nextStatus;
        user.UserRoles.Clear();
        user.UserRoles.Add(new UserRole { RoleId = role.Id });
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { id });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, UpdateStatusRequest request)
    {
        var user = await _users.GetByIdWithRolesAsync(id);
        if (user is null) return NotFound();

        var nextStatus = NormalizeEntityStatus(request.Status);
        if (id == CurrentUserId && nextStatus != (int)EntityStatus.Active)
            return BadRequest(new { message = "Không thể tự khóa tài khoản đang đăng nhập." });

        if (HasRole(user, RoleConstant.Admin)
            && nextStatus != (int)EntityStatus.Active
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
            return BadRequest(new { message = "Không thể khóa Admin hoạt động cuối cùng." });

        user.Status = nextStatus;
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { id });
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _users.GetByIdWithRolesAsync(id);
        if (user is null) return NotFound();

        if (id == CurrentUserId)
            return BadRequest(new { message = "Không thể xóa tài khoản đang đăng nhập." });

        if (HasRole(user, RoleConstant.Admin)
            && !await _users.AnyUserInRoleAsync(RoleConstant.Admin, excludingUserId: id, status: (int)EntityStatus.Active))
            return BadRequest(new { message = "Không thể xóa Admin hoạt động cuối cùng." });

        // Khóa mềm thay vì xóa cứng: giữ lịch sử (đơn/đánh giá/địa chỉ), tránh mồ côi dữ liệu.
        user.Status = (int)EntityStatus.Inactive;
        user.UpdatedDate = DateTime.UtcNow;
        await _users.SaveChangesAsync();
        return Ok(new { message = "Đã khóa tài khoản. Có thể mở lại bằng cập nhật trạng thái." });
    }

    private static bool HasRole(User user, string role) => user.UserRoles.Any(ur => ur.Role.Code == role);

    private static string? NormalizeInternalRole(string? role) => role switch
    {
        RoleConstant.Admin => RoleConstant.Admin,
        RoleConstant.Staff => RoleConstant.Staff,
        _ => null,
    };

    private static int NormalizeEntityStatus(int status) => status switch
    {
        (int)EntityStatus.Deleted => (int)EntityStatus.Deleted,
        (int)EntityStatus.Inactive => (int)EntityStatus.Inactive,
        _ => (int)EntityStatus.Active,
    };

    private static int? ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        if (int.TryParse(status, out var numeric)) return NormalizeEntityStatus(numeric);

        return status.Trim() switch
        {
            "Active" => (int)EntityStatus.Active,
            "Inactive" => (int)EntityStatus.Inactive,
            "Deleted" or "Locked" => (int)EntityStatus.Deleted,
            _ => null,
        };
    }

    private async Task<string> BuildCustomerEmailAsync(string? email, string? phoneNumber, int? currentUserId = null)
    {
        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalized = email.Trim().ToLowerInvariant();
            var existing = await _users.GetByEmailWithRolesAsync(normalized);
            if (existing is not null && existing.Id != currentUserId)
                throw new InvalidOperationException("Email đã được sử dụng.");

            return normalized;
        }

        var token = NormalizeEmailToken(phoneNumber);
        var generated = $"customer-{token}@motosale.local";
        var conflict = await _users.GetByEmailWithRolesAsync(generated);
        if (conflict is null || conflict.Id == currentUserId) return generated;

        return $"customer-{Guid.NewGuid():N}@motosale.local";
    }

    private static string NormalizeEmailToken(string? value)
    {
        var token = new string((value ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        return string.IsNullOrWhiteSpace(token) ? Guid.NewGuid().ToString("N")[..12] : token;
    }
}
