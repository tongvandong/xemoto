using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class ReservationRepository : Repository<Reservation>, IReservationRepository
{
    public ReservationRepository(AppDbContext context) : base(context) { }

    public async Task<List<HoldDto>> GetHoldsAsync() =>
        await (from r in Set.AsNoTracking()
               where r.ReservationStatus == ReservationStatus.Active || r.ReservationStatus == ReservationStatus.Confirmed
               join s in Context.Skus.AsNoTracking() on r.SkuId equals s.Id
               join p in Context.Products.AsNoTracking() on s.ProductId equals p.Id
               join o in Context.Orders.AsNoTracking() on r.OrderId equals o.Id into orders
               from o in orders.DefaultIfEmpty()
               orderby r.ExpiresAt
               select new HoldDto(r.Id, r.OrderId, o != null ? o.Code : null, r.SkuId, s.SkuCode, p.Name, r.Qty, r.ReservationStatus, r.ExpiresAt))
              .ToListAsync();

    public async Task<int> GetActiveQtyAsync(int skuId) =>
        await Set.Where(r => r.SkuId == skuId &&
                (r.ReservationStatus == ReservationStatus.Active || r.ReservationStatus == ReservationStatus.Confirmed))
            .SumAsync(r => (int?)r.Qty) ?? 0;

    public Task<List<Reservation>> GetByOrderAsync(int orderId) =>
        Set.Where(r => r.OrderId == orderId).ToListAsync();
}
