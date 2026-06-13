using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class ReservationRepository : Repository<Reservation>, IReservationRepository
{
    public ReservationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<HoldDto>> GetHoldsAsync()
    {
        List<HoldDto> holds = await (
            from reservation in Set.AsNoTracking()
            where reservation.ReservationStatus == ReservationStatus.Active
                  || reservation.ReservationStatus == ReservationStatus.Confirmed
            join sku in Context.Skus.AsNoTracking() on reservation.SkuId equals sku.Id
            join product in Context.Products.AsNoTracking() on sku.ProductId equals product.Id
            join order in Context.Orders.AsNoTracking() on reservation.OrderId equals order.Id into orders
            from order in orders.DefaultIfEmpty()
            orderby reservation.ExpiresAt
            select new HoldDto(
                reservation.Id,
                reservation.OrderId,
                order.Code,
                reservation.SkuId,
                sku.SkuCode,
                product.Name,
                reservation.Qty,
                reservation.ReservationStatus,
                reservation.ExpiresAt))
            .ToListAsync();

        return holds;
    }

    public async Task<int> GetActiveQtyAsync(int skuId)
    {
        int? quantity = await Set
            .Where(reservation =>
                reservation.SkuId == skuId
                && (reservation.ReservationStatus == ReservationStatus.Active
                    || reservation.ReservationStatus == ReservationStatus.Confirmed))
            .SumAsync(reservation => (int?)reservation.Qty);

        return quantity ?? 0;
    }

    public async Task<List<Reservation>> GetByOrderAsync(int orderId)
    {
        List<Reservation> reservations = await Set
            .Where(reservation => reservation.OrderId == orderId)
            .ToListAsync();

        return reservations;
    }

    public async Task<List<int>> GetExpiredActiveOrderIdsAsync(DateTime asOf)
    {
        List<int> orderIds = await Set
            .Where(reservation => reservation.ReservationStatus == ReservationStatus.Active
                                  && reservation.ExpiresAt < asOf)
            .Select(reservation => reservation.OrderId)
            .Distinct()
            .ToListAsync();

        return orderIds;
    }
}
