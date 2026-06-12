using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Entities.Inventory;

namespace MoToSale.Repository;

// Seed tồn kho: InventoryItem và StockMovement tồn đầu kỳ cho từng SKU.
public static partial class SeedConfiguration
{
    private static async Task AddMissingInventoryAsync(AppDbContext db, DateTime now)
    {
        var skus = await db.Skus.OrderBy(x => x.Id).ToListAsync();
        var existing = await db.InventoryItems.Select(x => x.SkuId).ToListAsync();
        var existingSkuIds = existing.ToHashSet();
        var index = 0;
        foreach (var sku in skus)
        {
            if (existingSkuIds.Contains(sku.Id)) continue;
            var onHand = sku.ListPrice > 10_000_000 ? 2 + index % 6 : 12 + index % 35;
            if (index % 11 == 0) onHand = 3;
            var item = new InventoryItem { SkuId = sku.Id, OnHand = onHand, Reserved = 0, ReorderPoint = sku.ListPrice > 10_000_000 ? 2 : 5, CreatedDate = now };
            db.InventoryItems.Add(item);
            db.StockMovements.Add(new StockMovement { SkuId = sku.Id, Type = (int)StockMovementType.Receipt, QtyDelta = onHand, BalanceAfter = onHand, RefType = "Seed", Reason = "Tồn đầu kỳ dữ liệu mẫu", OccurredAt = now, CreatedDate = now });
            index++;
        }
    }
}
