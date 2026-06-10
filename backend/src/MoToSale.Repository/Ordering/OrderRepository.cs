using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context) { }

    public Task<Order?> GetDetailAsync(int id) =>
        Set.Include(o => o.Lines).ThenInclude(l => l.Allocations)
            .FirstOrDefaultAsync(o => o.Id == id);

    public Task<List<Order>> GetByUserAsync(int userId) =>
        Set.AsNoTracking().Include(o => o.Lines).Where(o => o.UserId == userId)
            .OrderByDescending(o => o.Id).ToListAsync();

    public async Task<PagingResponse<Order>> SearchAsync(OrderSearchRequest r)
    {
        var query = Set.AsNoTracking().Include(o => o.Lines).AsQueryable();
        if (!string.IsNullOrWhiteSpace(r.OrderStatus)) query = query.Where(o => o.OrderStatus == r.OrderStatus);
        if (!string.IsNullOrWhiteSpace(r.PaymentStatus)) query = query.Where(o => o.PaymentStatus == r.PaymentStatus);
        if (!string.IsNullOrWhiteSpace(r.FulfillmentStatus)) query = query.Where(o => o.FulfillmentStatus == r.FulfillmentStatus);
        if (r.StartDate.HasValue) query = query.Where(o => (o.PlacedAt ?? o.CreatedDate) >= r.StartDate.Value.Date);
        if (r.EndDate.HasValue) query = query.Where(o => (o.PlacedAt ?? o.CreatedDate) < r.EndDate.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(r.Keyword))
        {
            var keyword = r.Keyword.Trim();
            query = query.Where(o =>
                o.Code.Contains(keyword)
                || o.ShippingRecipient.Contains(keyword)
                || o.ShippingPhone.Contains(keyword)
                || (o.ShippingEmail != null && o.ShippingEmail.Contains(keyword))
                || Context.Users.Any(u => u.Id == o.UserId
                    && (u.FullName.Contains(keyword)
                        || u.Email.Contains(keyword)
                        || (u.PhoneNumber != null && u.PhoneNumber.Contains(keyword)))));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(o => o.Id)
            .Skip((r.Page - 1) * r.PageSize).Take(r.PageSize).ToListAsync();
        return new PagingResponse<Order> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }

    public void AddStatusHistory(OrderStatusHistory history) => Context.OrderStatusHistories.Add(history);

    public Task<List<OrderStatusHistory>> GetHistoriesAsync(int orderId) =>
        Context.OrderStatusHistories.AsNoTracking().Where(x => x.OrderId == orderId)
            .OrderBy(x => x.CreatedDate).ThenBy(x => x.Id).ToListAsync();
}
