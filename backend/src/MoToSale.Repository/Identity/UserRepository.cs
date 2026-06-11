using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public class UserRepository : Repository<User>, IUserRepository
{
    private static readonly string[] InternalRoles = { "Admin", "Staff" };

    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailWithRolesAsync(string email)
    {
        User? user = await Query
            .Include(item => item.UserRoles)
            .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(item => item.Email == email);

        return user;
    }

    public async Task<User?> GetByIdWithRolesAsync(int id)
    {
        User? user = await Query
            .Include(item => item.UserRoles)
            .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(item => item.Id == id);

        return user;
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        bool exists = await Query.AnyAsync(user => user.Email == email);
        return exists;
    }

    public async Task<Role> GetRoleByCodeAsync(string code)
    {
        Role role = await Context
            .Set<Role>()
            .FirstAsync(item => item.Code == code);

        return role;
    }

    public async Task<PagingResponse<User>> SearchAsync(PagingRequest request, string? role = null, int? status = null)
    {
        IQueryable<User> query = Query
            .AsNoTracking()
            .Include(user => user.UserRoles)
            .ThenInclude(userRole => userRole.Role)
            .Where(user => user.UserRoles.Any(userRole => InternalRoles.Contains(userRole.Role.Code)));

        if (!string.IsNullOrWhiteSpace(role) && InternalRoles.Contains(role))
        {
            query = query.Where(user => user.UserRoles.Any(userRole => userRole.Role.Code == role));
        }

        query = ApplyStatusFilter(query, status);
        query = ApplyKeywordFilter(query, request.Keyword);

        return await BuildUserPageAsync(query, request);
    }

    public async Task<PagingResponse<User>> SearchCustomersAsync(PagingRequest request, int? status = null)
    {
        IQueryable<User> query = Query
            .AsNoTracking()
            .Where(user => user.UserRoles.Any(userRole => userRole.Role.Code == "Customer"));

        query = ApplyStatusFilter(query, status);
        query = ApplyKeywordFilter(query, request.Keyword);

        return await BuildUserPageAsync(query, request);
    }

    public async Task<bool> AnyUserInRoleAsync(string role, int? excludingUserId = null, int? status = null)
    {
        IQueryable<User> query = Query
            .Where(user => user.UserRoles.Any(userRole => userRole.Role.Code == role));

        if (excludingUserId.HasValue)
        {
            int userId = excludingUserId.Value;
            query = query.Where(user => user.Id != userId);
        }

        query = ApplyStatusFilter(query, status);

        bool exists = await query.AnyAsync();
        return exists;
    }

    private static IQueryable<User> ApplyStatusFilter(IQueryable<User> query, int? status)
    {
        if (status.HasValue)
        {
            int statusValue = status.Value;
            query = query.Where(user => user.Status == statusValue);
        }

        return query;
    }

    private static IQueryable<User> ApplyKeywordFilter(IQueryable<User> query, string? keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return query;
        }

        string searchText = keyword;

        query = query.Where(user =>
            user.FullName.Contains(searchText)
            || user.Email.Contains(searchText)
            || (user.PhoneNumber != null && user.PhoneNumber.Contains(searchText)));

        return query;
    }

    private static async Task<PagingResponse<User>> BuildUserPageAsync(IQueryable<User> query, PagingRequest request)
    {
        int totalItems = await query.CountAsync();

        List<User> items = await query
            .OrderByDescending(user => user.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<User>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }
}
