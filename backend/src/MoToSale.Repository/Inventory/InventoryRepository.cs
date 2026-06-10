using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class InventoryRepository : Repository<InventoryItem>, IInventoryRepository
{
    public InventoryRepository(AppDbContext context) : base(context) { }

    public Task<InventoryItem?> GetItemAsync(int skuId) =>
        Set.FirstOrDefaultAsync(i => i.SkuId == skuId);

    public async Task<InventoryItem> GetOrCreateItemAsync(int skuId)
    {
        var item = await GetItemAsync(skuId);
        if (item is null)
        {
            item = new InventoryItem { SkuId = skuId, OnHand = 0, Reserved = 0, CreatedDate = DateTime.UtcNow };
            Set.Add(item);
        }
        return item;
    }

    public void AddMovement(StockMovement movement) => Context.StockMovements.Add(movement);

    public async Task<int> GetOnHandTotalAsync(int skuId) =>
        await Set.Where(i => i.SkuId == skuId).SumAsync(i => (int?)i.OnHand) ?? 0;

    public Task<int> GetTotalAvailableAsync(int skuId) =>
        Set.Where(i => i.SkuId == skuId).SumAsync(i => i.OnHand - i.Reserved);

    public async Task<PagingResponse<InventoryItemDto>> SearchAsync(InventorySearchRequest r)
    {
        var query =
            from i in Set.AsNoTracking()
            join s in Context.Skus.AsNoTracking() on i.SkuId equals s.Id
            join p in Context.Products.AsNoTracking() on s.ProductId equals p.Id
            select new { i, s, p };

        if (r.LowStockOnly == true) query = query.Where(x => x.i.OnHand - x.i.Reserved <= x.i.ReorderPoint);
        if (r.HasHold == true) query = query.Where(x => x.i.Reserved > 0);
        query = r.StockStatus switch
        {
            "OutOfStock" => query.Where(x => x.i.OnHand - x.i.Reserved <= 0),
            "LowStock" => query.Where(x => x.i.OnHand - x.i.Reserved > 0 && x.i.OnHand - x.i.Reserved <= x.i.ReorderPoint),
            "InStock" => query.Where(x => x.i.OnHand - x.i.Reserved > x.i.ReorderPoint),
            _ => query,
        };
        if (!string.IsNullOrWhiteSpace(r.Keyword))
            query = query.Where(x => x.p.Name.Contains(r.Keyword!) || x.s.SkuCode.Contains(r.Keyword!));

        var desc = string.Equals(r.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        query = (r.SortBy?.ToLowerInvariant()) switch
        {
            "onhand" => desc ? query.OrderByDescending(x => x.i.OnHand) : query.OrderBy(x => x.i.OnHand),
            "reserved" => desc ? query.OrderByDescending(x => x.i.Reserved) : query.OrderBy(x => x.i.Reserved),
            "available" => desc ? query.OrderByDescending(x => x.i.OnHand - x.i.Reserved) : query.OrderBy(x => x.i.OnHand - x.i.Reserved),
            "product" => desc ? query.OrderByDescending(x => x.p.Name) : query.OrderBy(x => x.p.Name),
            _ => query.OrderBy(x => x.p.Name).ThenBy(x => x.s.SkuCode),
        };

        var total = await query.CountAsync();
        var rows = await query
            .Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(x => new InventoryItemDto(
                x.i.SkuId, x.s.SkuCode, x.p.Name,
                x.i.OnHand, x.i.Reserved, x.i.OnHand - x.i.Reserved, x.i.ReorderPoint, x.i.UpdatedDate ?? x.i.CreatedDate))
            .ToListAsync();

        return new PagingResponse<InventoryItemDto> { Items = rows, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }

    public async Task<InventorySummary> GetSummaryAsync()
    {
        var rows = await Set.AsNoTracking().Select(i => new { i.OnHand, i.Reserved, i.ReorderPoint }).ToListAsync();
        return new InventorySummary(
            rows.Count,
            rows.Count(x => x.OnHand - x.Reserved <= 0),
            rows.Count(x => x.OnHand - x.Reserved > 0 && x.OnHand - x.Reserved <= x.ReorderPoint),
            rows.Count(x => x.Reserved > 0),
            rows.Sum(x => x.OnHand),
            rows.Sum(x => x.Reserved));
    }

    public async Task<DateTime?> GetLastUpdatedAtAsync()
    {
        return await Set.AsNoTracking().MaxAsync(i => (DateTime?)(i.UpdatedDate ?? i.CreatedDate));
    }

    public async Task<Dictionary<int, int>> GetOnHandBySkusAsync(IEnumerable<int> skuIds)
    {
        var ids = skuIds.Distinct().ToList();
        if (ids.Count == 0) return new();
        var rows = await Set.AsNoTracking().Where(i => ids.Contains(i.SkuId))
            .GroupBy(i => i.SkuId).Select(g => new { SkuId = g.Key, OnHand = g.Sum(x => x.OnHand) }).ToListAsync();
        return rows.ToDictionary(x => x.SkuId, x => x.OnHand);
    }

    public async Task<int> SyncFromLedgerAsync()
    {
        var items = await Set.ToListAsync();
        var balances = await Context.StockMovements
            .GroupBy(m => m.SkuId)
            .Select(g => new { SkuId = g.Key, Sum = g.Sum(x => x.QtyDelta) })
            .ToListAsync();
        var map = balances.ToDictionary(b => b.SkuId, b => b.Sum);

        // Tính lại lượng đang giữ chỗ (Active/Confirmed) theo bảng Reservation — sửa mọi sai lệch.
        var reservedRows = await Context.Reservations
            .Where(r => r.ReservationStatus == ReservationStatus.Active || r.ReservationStatus == ReservationStatus.Confirmed)
            .GroupBy(r => r.SkuId)
            .Select(g => new { SkuId = g.Key, Qty = g.Sum(x => x.Qty) })
            .ToListAsync();
        var reservedMap = reservedRows.ToDictionary(b => b.SkuId, b => b.Qty);

        var now = DateTime.UtcNow;
        var changed = 0;
        foreach (var item in items)
        {
            var bal = map.GetValueOrDefault(item.SkuId, 0);
            var reserved = reservedMap.GetValueOrDefault(item.SkuId, 0);
            if (item.OnHand != bal || item.Reserved != reserved) { item.OnHand = bal; item.Reserved = reserved; item.UpdatedDate = now; changed++; continue; }
        }
        await Context.SaveChangesAsync();
        return changed;
    }

    public async Task<List<InventoryItem>> GetAllForExportAsync()
    {
        return await Set.AsNoTracking().ToListAsync();
    }

    public async Task<List<StockMovementDto>> GetMovementsAsync(int? skuId, int take = 200)
    {
        var q =
            from m in Context.StockMovements.AsNoTracking()
            join s in Context.Skus.AsNoTracking() on m.SkuId equals s.Id
            join p in Context.Products.AsNoTracking() on s.ProductId equals p.Id
            select new { m, s, p };

        if (skuId.HasValue) q = q.Where(x => x.m.SkuId == skuId);
        return await q.OrderByDescending(x => x.m.OccurredAt).ThenByDescending(x => x.m.Id).Take(take)
            .Select(x => new StockMovementDto(
                x.m.Id, x.m.SkuId, x.m.Type, x.m.QtyDelta, x.m.BalanceAfter,
                x.m.RefType, x.m.RefId, x.m.Reason, x.m.OccurredAt,
                x.s.SkuCode, x.p.Code, x.p.Name, x.m.BalanceAfter - x.m.QtyDelta))
            .ToListAsync();
    }
}
