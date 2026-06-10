using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public Task<User?> GetByEmailWithRolesAsync(string email) =>
        Query.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == email);

    public Task<User?> GetByIdWithRolesAsync(int id) =>
        Query.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

    public Task<bool> EmailExistsAsync(string email) => AnyAsync(u => u.Email == email);

    public Task<Role> GetRoleByCodeAsync(string code) =>
        Context.Set<Role>().FirstAsync(r => r.Code == code);

    public async Task<PagingResponse<User>> SearchAsync(PagingRequest request, string? role = null, int? status = null)
    {
        var internalRoles = new[] { "Admin", "Staff" };
        var query = Query.AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Where(u => u.UserRoles.Any(ur => internalRoles.Contains(ur.Role.Code)));

        if (!string.IsNullOrWhiteSpace(role) && internalRoles.Contains(role))
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Code == role));

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        var filtered = string.IsNullOrWhiteSpace(request.Keyword)
            ? query
            : query.Where(u => u.FullName.Contains(request.Keyword!)
                || u.Email.Contains(request.Keyword!)
                || (u.PhoneNumber != null && u.PhoneNumber.Contains(request.Keyword!)));

        var total = await filtered.CountAsync();
        var items = await filtered
            .OrderByDescending(u => u.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<User>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = total,
        };
    }

    public async Task<PagingResponse<User>> SearchCustomersAsync(PagingRequest request, int? status = null)
    {
        var query = Query.AsNoTracking()
            .Where(u => u.UserRoles.Any(ur => ur.Role.Code == "Customer"));

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(request.Keyword))
            query = query.Where(u => u.FullName.Contains(request.Keyword!)
                || u.Email.Contains(request.Keyword!)
                || (u.PhoneNumber != null && u.PhoneNumber.Contains(request.Keyword!)));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(u => u.Id)
            .Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync();
        return new PagingResponse<User> { Items = items, Page = request.Page, PageSize = request.PageSize, TotalItems = total };
    }

    public Task<bool> AnyUserInRoleAsync(string role, int? excludingUserId = null, int? status = null)
    {
        var query = Query.Where(u => u.UserRoles.Any(ur => ur.Role.Code == role));
        if (excludingUserId.HasValue)
            query = query.Where(u => u.Id != excludingUserId.Value);
        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);
        return query.AnyAsync();
    }
}
