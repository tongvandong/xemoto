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

    public async Task<PagingResponse<Voucher>> SearchAsync(PagingRequest request)
    {
        IQueryable<Voucher> query = Set.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword;
            query = query.Where(voucher => voucher.Code.Contains(keyword));
        }

        int totalItems = await query.CountAsync();

        List<Voucher> items = await query
            .OrderByDescending(voucher => voucher.Id)
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
}
