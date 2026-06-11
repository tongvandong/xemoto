using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
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
}
