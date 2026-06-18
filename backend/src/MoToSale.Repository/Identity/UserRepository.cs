using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Auth;
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

    public async Task<PagingResponse<User>> SearchCustomersAsync(CustomerSearchRequest request)
    {
        IQueryable<User> query = Query
            .AsNoTracking()
            .Where(user => user.UserRoles.Any(userRole => userRole.Role.Code == "Customer"));

        query = ApplyKeywordFilter(query, request.Keyword);
        query = ApplyCustomerFieldFilters(query, request);

        return await BuildUserPageAsync(query, request, request.SortBy, request.SortDescending);
    }

    public async Task<Dictionary<int, CustomerOrderStatsDto>> GetOrderStatsByCustomerIdsAsync(IReadOnlyCollection<int> customerIds)
    {
        if (customerIds.Count == 0)
        {
            return new Dictionary<int, CustomerOrderStatsDto>();
        }

        const string cancelledStatus = "Cancelled";

        List<CustomerOrderStatsDto> stats = await Context.Orders
            .AsNoTracking()
            .Where(order => customerIds.Contains(order.UserId))
            .GroupBy(order => order.UserId)
            .Select(group => new CustomerOrderStatsDto(
                group.Key,
                group.Count(),
                group.Where(order => order.OrderStatus != cancelledStatus).Sum(order => order.GrandTotal),
                group.Count(order => order.OrderStatus == cancelledStatus),
                group.Max(order => order.PlacedAt ?? order.CreatedDate)))
            .ToListAsync();

        return stats.ToDictionary(item => item.CustomerId);
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

    private static IQueryable<User> ApplyCustomerFieldFilters(IQueryable<User> query, CustomerSearchRequest request)
    {
        query = ApplyStatusFilter(query, request.Status);

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            string phoneNumber = request.PhoneNumber.Trim();
            query = query.Where(user => user.PhoneNumber != null && user.PhoneNumber.Contains(phoneNumber));
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            string email = request.Email.Trim();
            query = query.Where(user => user.Email.Contains(email));
        }

        if (request.HasCareNote.HasValue)
        {
            if (request.HasCareNote.Value)
            {
                query = query.Where(user => user.CareNote != null && user.CareNote != "");
            }
            else
            {
                query = query.Where(user => user.CareNote == null || user.CareNote == "");
            }
        }

        if (request.CreatedFrom.HasValue)
        {
            DateTime createdFrom = request.CreatedFrom.Value.Date;
            query = query.Where(user => user.CreatedDate >= createdFrom);
        }

        if (request.CreatedTo.HasValue)
        {
            DateTime createdTo = request.CreatedTo.Value.Date.AddDays(1);
            query = query.Where(user => user.CreatedDate < createdTo);
        }

        return query;
    }

    private static async Task<PagingResponse<User>> BuildUserPageAsync(
        IQueryable<User> query,
        PagingRequest request,
        string? sortBy = null,
        bool sortDescending = true)
    {
        int totalItems = await query.CountAsync();
        query = ApplySorting(query, sortBy, sortDescending);

        List<User> items = await query
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

    private static IQueryable<User> ApplySorting(IQueryable<User> query, string? sortBy, bool sortDescending)
    {
        string normalizedSortBy = string.IsNullOrWhiteSpace(sortBy)
            ? "id"
            : sortBy.Trim().ToLowerInvariant();

        return normalizedSortBy switch
        {
            "fullname" or "name" => sortDescending
                ? query.OrderByDescending(user => user.FullName)
                : query.OrderBy(user => user.FullName),
            "email" => sortDescending
                ? query.OrderByDescending(user => user.Email)
                : query.OrderBy(user => user.Email),
            "phonenumber" or "phone" => sortDescending
                ? query.OrderByDescending(user => user.PhoneNumber)
                : query.OrderBy(user => user.PhoneNumber),
            "status" => sortDescending
                ? query.OrderByDescending(user => user.Status)
                : query.OrderBy(user => user.Status),
            "createddate" or "createdat" => sortDescending
                ? query.OrderByDescending(user => user.CreatedDate)
                : query.OrderBy(user => user.CreatedDate),
            _ => sortDescending
                ? query.OrderByDescending(user => user.Id)
                : query.OrderBy(user => user.Id),
        };
    }
}
