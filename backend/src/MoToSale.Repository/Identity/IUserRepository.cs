using MoToSale.DTO.Common;
using MoToSale.DTO.Auth;
using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailWithRolesAsync(string email);
    Task<User?> GetByIdWithRolesAsync(int id);
    Task<bool> EmailExistsAsync(string email);
    Task<Role> GetRoleByCodeAsync(string code);
    Task<PagingResponse<User>> SearchAsync(PagingRequest request, string? role = null, int? status = null);
    Task<PagingResponse<User>> SearchCustomersAsync(CustomerSearchRequest request);
    Task<Dictionary<int, CustomerOrderStatsDto>> GetOrderStatsByCustomerIdsAsync(IReadOnlyCollection<int> customerIds);
    Task<bool> AnyUserInRoleAsync(string role, int? excludingUserId = null, int? status = null);
}
