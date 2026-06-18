using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;

namespace MoToSale.Services.Identity;

public interface IUserManagementService
{
    Task<UserResponse?> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<ItemsResponse<AddressDto>> GetAddressesAsync(int userId);
    Task<int> AddAddressAsync(int userId, AddressRequest request);
    Task UpdateAddressAsync(int userId, int addressId, AddressRequest request);
    Task SetDefaultAddressAsync(int userId, int addressId);
    Task DeleteAddressAsync(int userId, int addressId);
    Task<PagingResponse<UserListItemDto>> SearchUsersAsync(PagingRequest request, string? search, string? role, string? status);
    Task<PagingResponse<CustomerDto>> SearchCustomersAsync(CustomerSearchRequest request);
    Task<int> CreateCustomerAsync(CustomerUpsertRequest request);
    Task UpdateCustomerAsync(int id, CustomerUpsertRequest request);
    Task UpdateCareNoteAsync(int id, CareNoteRequest request);
    Task<UserDetailDto?> GetByIdAsync(int id);
    Task<int> CreateUserAsync(CreateUserRequest request, int currentUserId);
    Task UpdateUserAsync(int id, AdminUpdateUserRequest request, int currentUserId);
    Task SetStatusAsync(int id, UpdateStatusRequest request, int currentUserId);
    Task DeleteAsync(int id, int currentUserId);
}

public class UserManagementException : Exception
{
    public UserManagementException(string message) : base(message)
    {
    }
}
