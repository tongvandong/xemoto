using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class VoucherRepository : Repository<Voucher>, IVoucherRepository
{
    public VoucherRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagingResponse<Voucher>> SearchAsync(VoucherSearchRequest request)
    {
        IQueryable<Voucher> query = Set.AsNoTracking().AsQueryable();

        query = ApplyKeywordFilter(query, request);
        query = ApplyFieldFilters(query, request);

        int totalItems = await query.CountAsync();
        query = ApplySorting(query, request);

        List<Voucher> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<Voucher>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<Voucher?> GetByCodeAsync(string code)
    {
        Voucher? voucher = await Set.FirstOrDefaultAsync(item => item.Code == code);
        return voucher;
    }

    public async Task<bool> CodeExistsAsync(string code, int? exceptId = null)
    {
        bool exists = await Set.AnyAsync(voucher =>
            voucher.Code == code
            && (!exceptId.HasValue || voucher.Id != exceptId.Value));

        return exists;
    }

    public async Task<Dictionary<int, List<VoucherScopeDto>>> GetScopeMapAsync(IReadOnlyCollection<int> voucherIds)
    {
        if (voucherIds.Count == 0)
        {
            return new Dictionary<int, List<VoucherScopeDto>>();
        }

        List<VoucherScope> scopes = await Context.VoucherScopes
            .AsNoTracking()
            .Where(scope => voucherIds.Contains(scope.VoucherId))
            .ToListAsync();

        if (scopes.Count == 0)
        {
            return new Dictionary<int, List<VoucherScopeDto>>();
        }

        // Gom Id theo từng loại để truy vấn tên 1 lần (tránh N+1).
        List<int> productIds = scopes.Where(s => s.ScopeType == "Product").Select(s => s.RefId).Distinct().ToList();
        List<int> categoryIds = scopes.Where(s => s.ScopeType == "Category").Select(s => s.RefId).Distinct().ToList();
        List<int> brandIds = scopes.Where(s => s.ScopeType == "Brand").Select(s => s.RefId).Distinct().ToList();

        Dictionary<int, string> productNames = await Context.Products
            .AsNoTracking().Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name);
        Dictionary<int, string> categoryNames = await Context.Categories
            .AsNoTracking().Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name);
        Dictionary<int, string> brandNames = await Context.Brands
            .AsNoTracking().Where(b => brandIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name);

        string? ResolveName(VoucherScope scope)
        {
            if (scope.ScopeType == "Product")
            {
                return productNames.TryGetValue(scope.RefId, out string? name) ? name : null;
            }
            if (scope.ScopeType == "Category")
            {
                return categoryNames.TryGetValue(scope.RefId, out string? name) ? name : null;
            }
            if (scope.ScopeType == "Brand")
            {
                return brandNames.TryGetValue(scope.RefId, out string? name) ? name : null;
            }
            return null;
        }

        return scopes
            .GroupBy(scope => scope.VoucherId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(scope => new VoucherScopeDto(scope.ScopeType, scope.RefId, ResolveName(scope))).ToList());
    }

    public async Task ReplaceScopesAsync(int voucherId, string? scopeType, IReadOnlyCollection<int>? refIds)
    {
        // Bước 1: xoá toàn bộ scope cũ của voucher này.
        List<VoucherScope> existing = await Context.VoucherScopes
            .Where(scope => scope.VoucherId == voucherId)
            .ToListAsync();
        Context.VoucherScopes.RemoveRange(existing);

        // Bước 2: nếu không phải toàn đơn thì thêm scope mới theo danh sách Id (bỏ trùng).
        bool isScoped = !string.IsNullOrWhiteSpace(scopeType) && scopeType != "All";
        if (isScoped && refIds != null)
        {
            foreach (int refId in refIds.Distinct())
            {
                Context.VoucherScopes.Add(new VoucherScope
                {
                    VoucherId = voucherId,
                    ScopeType = scopeType!,
                    RefId = refId,
                    CreatedDate = DateTime.UtcNow,
                });
            }
        }

        await Context.SaveChangesAsync();
    }

    private static IQueryable<Voucher> ApplyKeywordFilter(IQueryable<Voucher> query, VoucherSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Keyword))
        {
            return query;
        }

        string keyword = request.Keyword.Trim();

        return query.Where(voucher =>
            voucher.Code.Contains(keyword)
            || (voucher.Description != null && voucher.Description.Contains(keyword)));
    }

    private IQueryable<Voucher> ApplyFieldFilters(IQueryable<Voucher> query, VoucherSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.DiscountType))
        {
            string discountType = NormalizeDiscountType(request.DiscountType);
            query = query.Where(voucher => voucher.DiscountType == discountType);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(voucher => voucher.Status == request.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.ScopeType))
        {
            string scopeType = request.ScopeType.Trim();
            if (scopeType == "All")
            {
                query = query.Where(voucher => !Context.VoucherScopes.Any(scope => scope.VoucherId == voucher.Id));
            }
            else
            {
                query = query.Where(voucher => Context.VoucherScopes.Any(scope =>
                    scope.VoucherId == voucher.Id
                    && scope.ScopeType == scopeType));
            }
        }

        if (request.StartDate.HasValue)
        {
            DateTime startDate = request.StartDate.Value.Date;
            query = query.Where(voucher => voucher.StartAt >= startDate);
        }

        if (request.EndDate.HasValue)
        {
            DateTime endDate = request.EndDate.Value.Date.AddDays(1);
            query = query.Where(voucher => voucher.EndAt < endDate);
        }

        return query;
    }

    private static IQueryable<Voucher> ApplySorting(IQueryable<Voucher> query, VoucherSearchRequest request)
    {
        string sortBy = string.IsNullOrWhiteSpace(request.SortBy)
            ? "id"
            : request.SortBy.Trim().ToLowerInvariant();

        bool descending = request.SortDescending;

        return sortBy switch
        {
            "code" => descending
                ? query.OrderByDescending(voucher => voucher.Code)
                : query.OrderBy(voucher => voucher.Code),
            "discounttype" => descending
                ? query.OrderByDescending(voucher => voucher.DiscountType)
                : query.OrderBy(voucher => voucher.DiscountType),
            "discountvalue" => descending
                ? query.OrderByDescending(voucher => voucher.DiscountValue)
                : query.OrderBy(voucher => voucher.DiscountValue),
            "minordervalue" => descending
                ? query.OrderByDescending(voucher => voucher.MinOrderValue)
                : query.OrderBy(voucher => voucher.MinOrderValue),
            "usedcount" => descending
                ? query.OrderByDescending(voucher => voucher.UsedCount)
                : query.OrderBy(voucher => voucher.UsedCount),
            "usagelimit" => descending
                ? query.OrderByDescending(voucher => voucher.UsageLimit)
                : query.OrderBy(voucher => voucher.UsageLimit),
            "peruserlimit" => descending
                ? query.OrderByDescending(voucher => voucher.PerUserLimit)
                : query.OrderBy(voucher => voucher.PerUserLimit),
            "startat" => descending
                ? query.OrderByDescending(voucher => voucher.StartAt)
                : query.OrderBy(voucher => voucher.StartAt),
            "endat" => descending
                ? query.OrderByDescending(voucher => voucher.EndAt)
                : query.OrderBy(voucher => voucher.EndAt),
            "status" => descending
                ? query.OrderByDescending(voucher => voucher.Status)
                : query.OrderBy(voucher => voucher.Status),
            _ => descending
                ? query.OrderByDescending(voucher => voucher.Id)
                : query.OrderBy(voucher => voucher.Id),
        };
    }

    private static string NormalizeDiscountType(string discountType)
    {
        string value = discountType.Trim();
        if (value == "Fixed" || value == "FixedAmount")
        {
            return "Amount";
        }

        return value;
    }
}
