using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class InventoryRepository : Repository<InventoryItem>, IInventoryRepository
{
    public InventoryRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<InventoryItem?> GetItemAsync(int skuId)
    {
        InventoryItem? item = await Set.FirstOrDefaultAsync(row => row.SkuId == skuId);
        return item;
    }

    public async Task<InventoryItem> GetOrCreateItemAsync(int skuId)
    {
        InventoryItem? item = await GetItemAsync(skuId);

        if (item == null)
        {
            item = new InventoryItem
            {
                SkuId = skuId,
                OnHand = 0,
                Reserved = 0,
                CreatedDate = DateTime.UtcNow
            };

            Set.Add(item);
        }

        return item;
    }

    public void AddMovement(StockMovement movement)
    {
        Context.StockMovements.Add(movement);
    }

    public async Task<int> GetOnHandTotalAsync(int skuId)
    {
        int? total = await Set
            .Where(item => item.SkuId == skuId)
            .SumAsync(item => (int?)item.OnHand);

        return total ?? 0;
    }

    public async Task<int> GetTotalAvailableAsync(int skuId)
    {
        int total = await Set
            .Where(item => item.SkuId == skuId)
            .SumAsync(item => item.OnHand - item.Reserved);

        return total;
    }

    public async Task<PagingResponse<InventoryItemDto>> SearchAsync(InventorySearchRequest request)
    {
        IQueryable<InventoryRow> query = BuildSearchQuery();

        query = ApplyLowStockFilter(query, request);
        query = ApplyHoldFilter(query, request);
        query = ApplyStockStatusFilter(query, request);
        query = ApplyKeywordFilter(query, request);
        query = ApplySorting(query, request);

        int totalItems = await query.CountAsync();

        List<InventoryItemDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(row => new InventoryItemDto(
                row.inventory.SkuId,
                row.sku.SkuCode,
                row.product.Name,
                row.inventory.OnHand,
                row.inventory.Reserved,
                row.inventory.OnHand - row.inventory.Reserved,
                row.inventory.ReorderPoint,
                row.inventory.UpdatedDate ?? row.inventory.CreatedDate))
            .ToListAsync();

        return new PagingResponse<InventoryItemDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    // Row trung gian cho join tồn kho - SKU - sản phẩm; dùng member-init để EF Core
    // dịch query y hệt anonymous type. Tên thuộc tính viết thường có chủ đích
    // để các biểu thức row.inventory/row.sku/row.product giữ nguyên văn như cũ.
    private sealed class InventoryRow
    {
        public InventoryItem inventory { get; init; } = null!;
        public Sku sku { get; init; } = null!;
        public Product product { get; init; } = null!;
    }

    private IQueryable<InventoryRow> BuildSearchQuery()
    {
        return
            from inventory in Set.AsNoTracking()
            join sku in Context.Skus.AsNoTracking() on inventory.SkuId equals sku.Id
            join product in Context.Products.AsNoTracking() on sku.ProductId equals product.Id
            select new InventoryRow { inventory = inventory, sku = sku, product = product };
    }

    private static IQueryable<InventoryRow> ApplyLowStockFilter(IQueryable<InventoryRow> query, InventorySearchRequest request)
    {
        if (request.LowStockOnly == true)
        {
            query = query.Where(row => row.inventory.OnHand - row.inventory.Reserved <= row.inventory.ReorderPoint);
        }

        return query;
    }

    private static IQueryable<InventoryRow> ApplyHoldFilter(IQueryable<InventoryRow> query, InventorySearchRequest request)
    {
        if (request.HasHold == true)
        {
            query = query.Where(row => row.inventory.Reserved > 0);
        }

        return query;
    }

    private static IQueryable<InventoryRow> ApplyStockStatusFilter(IQueryable<InventoryRow> query, InventorySearchRequest request)
    {
        if (request.StockStatus == "OutOfStock")
        {
            query = query.Where(row => row.inventory.OnHand - row.inventory.Reserved <= 0);
        }

        if (request.StockStatus == "LowStock")
        {
            query = query.Where(row =>
                row.inventory.OnHand - row.inventory.Reserved > 0
                && row.inventory.OnHand - row.inventory.Reserved <= row.inventory.ReorderPoint);
        }

        if (request.StockStatus == "InStock")
        {
            query = query.Where(row => row.inventory.OnHand - row.inventory.Reserved > row.inventory.ReorderPoint);
        }

        return query;
    }

    private static IQueryable<InventoryRow> ApplyKeywordFilter(IQueryable<InventoryRow> query, InventorySearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword;
            query = query.Where(row =>
                row.product.Name.Contains(keyword)
                || row.sku.SkuCode.Contains(keyword));
        }

        return query;
    }

    private static IQueryable<InventoryRow> ApplySorting(IQueryable<InventoryRow> query, InventorySearchRequest request)
    {
        bool sortDescending = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        string sortBy = (request.SortBy ?? string.Empty).ToLowerInvariant();

        if (sortBy == "onhand")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(row => row.inventory.OnHand);
            }

            return query.OrderBy(row => row.inventory.OnHand);
        }

        if (sortBy == "reserved")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(row => row.inventory.Reserved);
            }

            return query.OrderBy(row => row.inventory.Reserved);
        }

        if (sortBy == "available")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(row => row.inventory.OnHand - row.inventory.Reserved);
            }

            return query.OrderBy(row => row.inventory.OnHand - row.inventory.Reserved);
        }

        if (sortBy == "product")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(row => row.product.Name);
            }

            return query.OrderBy(row => row.product.Name);
        }

        // mặc định: ổn định theo tên sản phẩm rồi mã SKU
        return query
            .OrderBy(row => row.product.Name)
            .ThenBy(row => row.sku.SkuCode);
    }

    public async Task<InventorySummary> GetSummaryAsync()
    {
        var rows = await Set
            .AsNoTracking()
            .Select(item => new
            {
                item.OnHand,
                item.Reserved,
                item.ReorderPoint
            })
            .ToListAsync();

        int outOfStock = rows.Count(item => item.OnHand - item.Reserved <= 0);
        int lowStock = rows.Count(item => item.OnHand - item.Reserved > 0 && item.OnHand - item.Reserved <= item.ReorderPoint);
        int withReservation = rows.Count(item => item.Reserved > 0);
        int totalOnHand = rows.Sum(item => item.OnHand);
        int totalReserved = rows.Sum(item => item.Reserved);

        return new InventorySummary(rows.Count, outOfStock, lowStock, withReservation, totalOnHand, totalReserved);
    }

    public async Task<DateTime?> GetLastUpdatedAtAsync()
    {
        DateTime? lastUpdatedAt = await Set
            .AsNoTracking()
            .MaxAsync(item => (DateTime?)(item.UpdatedDate ?? item.CreatedDate));

        return lastUpdatedAt;
    }

    public async Task<Dictionary<int, int>> GetOnHandBySkusAsync(IEnumerable<int> skuIds)
    {
        List<int> ids = skuIds.Distinct().ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        var rows = await Set
            .AsNoTracking()
            .Where(item => ids.Contains(item.SkuId))
            .GroupBy(item => item.SkuId)
            .Select(group => new
            {
                SkuId = group.Key,
                OnHand = group.Sum(item => item.OnHand)
            })
            .ToListAsync();

        Dictionary<int, int> result = rows.ToDictionary(row => row.SkuId, row => row.OnHand);
        return result;
    }

    public async Task<int> SyncFromLedgerAsync()
    {
        List<InventoryItem> items = await Set.ToListAsync();

        Dictionary<int, int> onHandBySku = await BuildOnHandMapFromMovementsAsync();
        Dictionary<int, int> reservedBySku = await BuildReservedMapAsync();

        DateTime now = DateTime.UtcNow;
        int changed = 0;

        foreach (InventoryItem item in items)
        {
            int onHand = onHandBySku.GetValueOrDefault(item.SkuId, 0);
            int reserved = reservedBySku.GetValueOrDefault(item.SkuId, 0);

            if (item.OnHand == onHand && item.Reserved == reserved)
            {
                continue;
            }

            item.OnHand = onHand;
            item.Reserved = reserved;
            item.UpdatedDate = now;
            changed++;
        }

        await Context.SaveChangesAsync();
        return changed;
    }

    public async Task<List<InventoryItem>> GetAllForExportAsync()
    {
        List<InventoryItem> items = await Set.AsNoTracking().ToListAsync();
        return items;
    }

    public async Task<List<StockMovementDto>> GetMovementsAsync(int? skuId, int take = 200)
    {
        var query =
            from movement in Context.StockMovements.AsNoTracking()
            join sku in Context.Skus.AsNoTracking() on movement.SkuId equals sku.Id
            join product in Context.Products.AsNoTracking() on sku.ProductId equals product.Id
            select new { movement, sku, product };

        if (skuId.HasValue)
        {
            int id = skuId.Value;
            query = query.Where(row => row.movement.SkuId == id);
        }

        List<StockMovementDto> items = await query
            .OrderByDescending(row => row.movement.OccurredAt)
            .ThenByDescending(row => row.movement.Id)
            .Take(take)
            .Select(row => new StockMovementDto(
                row.movement.Id,
                row.movement.SkuId,
                row.movement.Type,
                row.movement.QtyDelta,
                row.movement.BalanceAfter,
                row.movement.RefType,
                row.movement.RefId,
                row.movement.Reason,
                row.movement.OccurredAt,
                row.sku.SkuCode,
                row.product.Code,
                row.product.Name,
                row.movement.BalanceAfter - row.movement.QtyDelta))
            .ToListAsync();

        return items;
    }

    private async Task<Dictionary<int, int>> BuildOnHandMapFromMovementsAsync()
    {
        var balances = await Context.StockMovements
            .GroupBy(movement => movement.SkuId)
            .Select(group => new
            {
                SkuId = group.Key,
                Sum = group.Sum(movement => movement.QtyDelta)
            })
            .ToListAsync();

        return balances.ToDictionary(row => row.SkuId, row => row.Sum);
    }

    private async Task<Dictionary<int, int>> BuildReservedMapAsync()
    {
        var reservedRows = await Context.Reservations
            .Where(reservation =>
                reservation.ReservationStatus == ReservationStatus.Active
                || reservation.ReservationStatus == ReservationStatus.Confirmed)
            .GroupBy(reservation => reservation.SkuId)
            .Select(group => new
            {
                SkuId = group.Key,
                Qty = group.Sum(reservation => reservation.Qty)
            })
            .ToListAsync();

        return reservedRows.ToDictionary(row => row.SkuId, row => row.Qty);
    }
}
