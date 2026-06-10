using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class VoucherRepository : Repository<Voucher>, IVoucherRepository
{
    public VoucherRepository(AppDbContext context) : base(context) { }

    public async Task<PagingResponse<Voucher>> SearchAsync(PagingRequest r)
    {
        var query = Set.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(r.Keyword)) query = query.Where(v => v.Code.Contains(r.Keyword!));
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(v => v.Id).Skip((r.Page - 1) * r.PageSize).Take(r.PageSize).ToListAsync();
        return new PagingResponse<Voucher> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }

    public Task<Voucher?> GetByCodeAsync(string code) => Set.FirstOrDefaultAsync(v => v.Code == code);

    public Task<bool> CodeExistsAsync(string code, int? exceptId = null) =>
        Set.AnyAsync(v => v.Code == code && (exceptId == null || v.Id != exceptId));
}
