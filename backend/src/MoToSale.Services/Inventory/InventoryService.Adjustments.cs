using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;

namespace MoToSale.Services.Inventory;
public partial class InventoryService
{
    public async Task AdjustStockAsync(AdjustStockRequest request, int? userId)
    {
        ValidateAdjustStockRequest(request);

        DateTime now = DateTime.UtcNow;

        switch (request.TransactionType)
        {
            case "Import":
                await ApplyAsync(request.SkuId, StockMovementType.Receipt, request.Qty, 0, request.Reason, userId, now);
                break;
            case "Export":
                await ApplyAsync(request.SkuId, StockMovementType.Issue, -request.Qty, 0, request.Reason, userId, now);
                break;
            case "Adjust":
                await ApplyStocktakeAdjustmentAsync(request, userId, now);
                break;
            default:
                throw new InventoryException("Loại điều chỉnh không hợp lệ.");
        }

        await _inventory.SaveChangesAsync();
    }

    public async Task UpdateThresholdAsync(UpdateThresholdRequest request)
    {
        if (request.SkuId <= 0)
        {
            throw new InventoryException("SKU là bắt buộc.");
        }

        if (request.ReorderPoint < 0)
        {
            throw new InventoryException("Ngưỡng phải >= 0.");
        }

        var item = await _inventory.GetOrCreateItemAsync(request.SkuId);
        item.ReorderPoint = request.ReorderPoint;
        item.UpdatedDate = DateTime.UtcNow;

        await _inventory.SaveChangesAsync();
    }
    private static void ValidateAdjustStockRequest(AdjustStockRequest request)
    {
        if (request.Qty <= 0)
        {
            throw new InventoryException("Số lượng phải lớn hơn 0.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InventoryException("Lý do điều chỉnh là bắt buộc.");
        }
    }
    private async Task ApplyStocktakeDocumentLineAsync(StockDocument document, StockDocumentLine line, int? userId, DateTime now)
    {
        var item = await _inventory.GetOrCreateItemAsync(line.SkuId);
        int delta = line.Qty - item.OnHand;
        StockMovementType movementType = delta >= 0 ? StockMovementType.AdjustIn : StockMovementType.AdjustOut;

        await ApplyAsync(line.SkuId, movementType, delta, document.Id, document.Code, userId, now);
    }

    private async Task ApplyStocktakeAdjustmentAsync(AdjustStockRequest request, int? userId, DateTime now)
    {
        var item = await _inventory.GetOrCreateItemAsync(request.SkuId);
        int delta = request.Qty - item.OnHand;
        StockMovementType movementType = delta >= 0 ? StockMovementType.AdjustIn : StockMovementType.AdjustOut;

        await ApplyAsync(request.SkuId, movementType, delta, 0, request.Reason, userId, now);
    }

    // Cập nhật tồn kho và ghi một dòng sổ kho. Caller chịu trách nhiệm SaveChanges.
    private async Task ApplyAsync(int skuId, StockMovementType type, int qtyDelta, int docId, string reason, int? userId, DateTime now)
    {
        var item = await _inventory.GetOrCreateItemAsync(skuId);
        int balanceAfter = item.OnHand + qtyDelta;

        if (balanceAfter < 0)
        {
            throw new InventoryException($"Tồn kho không đủ cho SKU #{skuId}.");
        }

        if (qtyDelta < 0 && balanceAfter < item.Reserved)
        {
            throw new InventoryException($"Không thể giảm tồn SKU #{skuId} xuống {balanceAfter} vì đang giữ chỗ {item.Reserved} cho đơn hàng. Hãy hủy/giao bớt đơn giữ chỗ trước.");
        }

        item.OnHand = balanceAfter;
        item.UpdatedDate = now;

        _inventory.AddMovement(new StockMovement
        {
            SkuId = skuId,
            Type = (int)type,
            QtyDelta = qtyDelta,
            BalanceAfter = balanceAfter,
            RefType = "StockDocument",
            RefId = docId,
            Reason = reason,
            PerformedBy = userId,
            OccurredAt = now,
            CreatedDate = now,
        });
    }
}
