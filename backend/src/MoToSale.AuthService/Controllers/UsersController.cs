using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Services.Identity;

namespace MoToSale.AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IUserManagementService _users;

    public UsersController(IAuthService auth, IUserManagementService users)
    {
        _auth = auth;
        _users = users;
    }

    private int CurrentUserId
    {
        get
        {
            string? rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(rawUserId!);
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var profile = await _auth.GetProfileAsync(CurrentUserId);

        if (profile == null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        try
        {
            var profile = await _users.UpdateProfileAsync(CurrentUserId, request);
            return Ok(profile);
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        try
        {
            await _users.ChangePasswordAsync(CurrentUserId, request);
            return Ok(new MessageResponse { Message = "Đổi mật khẩu thành công." });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [HttpGet("me/addresses")]
    public async Task<IActionResult> GetAddresses()
    {
        var result = await _users.GetAddressesAsync(CurrentUserId);
        return Ok(result);
    }

    [HttpPost("me/addresses")]
    public async Task<IActionResult> AddAddress(AddressRequest request)
    {
        int id = await _users.AddAddressAsync(CurrentUserId, request);
        return Ok(new IdResponse { Id = id });
    }

    [HttpPut("me/addresses/{id:int}")]
    public async Task<IActionResult> UpdateAddress(int id, AddressRequest request)
    {
        try
        {
            await _users.UpdateAddressAsync(CurrentUserId, id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [HttpPut("me/addresses/{id:int}/default")]
    public async Task<IActionResult> SetDefaultAddress(int id)
    {
        try
        {
            await _users.SetDefaultAddressAsync(CurrentUserId, id);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [HttpDelete("me/addresses/{id:int}")]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        try
        {
            await _users.DeleteAddressAsync(CurrentUserId, id);
            return Ok(new MessageResponse { Message = "Đã xóa địa chỉ." });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status)
    {
        var result = await _users.SearchUsersAsync(request, search, role, status);
        return Ok(result);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? status)
    {
        var result = await _users.SearchCustomersAsync(request, search, status);
        return Ok(result);
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer(CustomerUpsertRequest request)
    {
        try
        {
            int id = await _users.CreateCustomerAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPut("customers/{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, CustomerUpsertRequest request)
    {
        try
        {
            await _users.UpdateCustomerAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
    [HttpPatch("customers/{id:int}/care-note")]
    public async Task<IActionResult> UpdateCareNote(int id, CareNoteRequest request)
    {
        try
        {
            await _users.UpdateCareNoteAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet("all")]
    public Task<IActionResult> All([FromQuery] PagingRequest request, [FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status)
    {
        return List(request, search, role, status);
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _users.GetByIdAsync(id);

        if (user == null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        try
        {
            int id = await _users.CreateUserAsync(request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AdminUpdateUserRequest request)
    {
        try
        {
            await _users.UpdateUserAsync(id, request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, UpdateStatusRequest request)
    {
        try
        {
            await _users.SetStatusAsync(id, request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _users.DeleteAsync(id, CurrentUserId);
            return Ok(new MessageResponse { Message = "Đã khóa tài khoản. Có thể mở lại bằng cập nhật trạng thái." });
        }
        catch (UserManagementException ex)
        {
            return HandleUserManagementException(ex);
        }
    }

    private IActionResult HandleUserManagementException(UserManagementException ex)
    {
        if (ex.Message.StartsWith("Không tìm thấy", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new MessageResponse { Message = ex.Message });
        }

        return BadRequest(new MessageResponse { Message = ex.Message });
    }
}
