using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;
public partial class UserManagementService
{
    public async Task<PagingResponse<UserListItemDto>> SearchUsersAsync(PagingRequest request, string? search, string? role, string? status)
    {
        ApplySearchKeyword(request, search);

        var page = await _users.SearchAsync(request, NormalizeInternalRole(role), ParseStatus(status));

        return new PagingResponse<UserListItemDto>
        {
            Items = page.Items.Select(MapUserListItem).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems
        };
    }

    public async Task<PagingResponse<CustomerDto>> SearchCustomersAsync(CustomerSearchRequest request)
    {
        ApplySearchKeyword(request, request.Search);

        var page = await _users.SearchCustomersAsync(request);
        List<int> customerIds = page.Items
            .Select(customer => customer.Id)
            .ToList();
        Dictionary<int, CustomerOrderStatsDto> statsByCustomerId = await _users.GetOrderStatsByCustomerIdsAsync(customerIds);

        return new PagingResponse<CustomerDto>
        {
            Items = page.Items
                .Select(customer => MapCustomer(customer, FindCustomerStats(statsByCustomerId, customer.Id)))
                .ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems
        };
    }

    private static CustomerOrderStatsDto? FindCustomerStats(Dictionary<int, CustomerOrderStatsDto> statsByCustomerId, int customerId)
    {
        return statsByCustomerId.TryGetValue(customerId, out CustomerOrderStatsDto? stats)
            ? stats
            : null;
    }

    public async Task<int> CreateCustomerAsync(CustomerUpsertRequest request)
    {
        ValidateCustomerName(request.FullName);

        string email = await BuildCustomerEmailAsync(request.Email, request.PhoneNumber);
        Role role = await _users.GetRoleByCodeAsync(RoleConstant.Customer);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = ValidateAndNormalizePhone(request.PhoneNumber),
            CareNote = NormalizeOptionalText(request.CareNote),
            PasswordHash = _hasher.Hash($"{Guid.NewGuid():N}@Customer1"),
            Status = NormalizeEntityStatus(request.Status),
            CreatedDate = DateTime.UtcNow,
            UserRoles = { new UserRole { RoleId = role.Id } }
        };

        _users.Add(user);
        await _users.SaveChangesAsync();

        return user.Id;
    }

    public async Task UpdateCustomerAsync(int id, CustomerUpsertRequest request)
    {
        ValidateCustomerName(request.FullName);

        User user = await GetCustomerOrThrowAsync(id);
        string email = await BuildCustomerEmailAsync(request.Email, request.PhoneNumber, id);

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.PhoneNumber = ValidateAndNormalizePhone(request.PhoneNumber);
        user.CareNote = NormalizeOptionalText(request.CareNote);
        user.Status = NormalizeEntityStatus(request.Status);
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }

    public async Task UpdateCareNoteAsync(int id, CareNoteRequest request)
    {
        User user = await GetCustomerOrThrowAsync(id);

        user.CareNote = request.CareNote;
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }

    public async Task<UserDetailDto?> GetByIdAsync(int id)
    {
        User? user = await _users.GetByIdWithRolesAsync(id);

        if (user == null)
        {
            return null;
        }

        return MapUserDetail(user);
    }
}
