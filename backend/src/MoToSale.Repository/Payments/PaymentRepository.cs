using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Payments;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Payments;

public class PaymentRepository : Repository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context) { }

    public async Task<PagingResponse<PaymentListItem>> SearchAsync(PagingRequest r, string? status)
    {
        var query =
            from p in Set.AsNoTracking()
            join o in Context.Orders.AsNoTracking() on p.OrderId equals o.Id into orders
            from o in orders.DefaultIfEmpty()
            select new { p, OrderCode = o != null ? o.Code : null };

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.p.PaymentRecordStatus == status);
        if (!string.IsNullOrWhiteSpace(r.Keyword)) query = query.Where(x => x.p.Code.Contains(r.Keyword!) || x.OrderCode!.Contains(r.Keyword!));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.p.Id)
            .Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(x => new PaymentListItem(x.p.Id, x.p.Code, x.p.OrderId, x.OrderCode, x.p.PaymentType, x.p.Amount, x.p.Method, x.p.PaymentRecordStatus, x.p.PaidAt, x.p.CreatedDate))
            .ToListAsync();
        return new PagingResponse<PaymentListItem> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }

    public Task<List<Payment>> GetByOrderAsync(int orderId) =>
        Set.AsNoTracking().Where(p => p.OrderId == orderId).OrderByDescending(p => p.Id).ToListAsync();

    public async Task<decimal> GetTotalPaidAsync(int orderId) =>
        await Set.Where(p => p.OrderId == orderId && p.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;
}
