using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public partial class BusinessOperationsService
{    public async Task<int> ReceivePurchaseOrderAsync(int id, ReceivePurchaseOrderRequest request, int? userId)
    {
        PurchaseOrder purchaseOrder = await _db.PurchaseOrders
            .Include(order => order.Lines)
            .FirstOrDefaultAsync(order => order.Id == id)
            ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");

        ValidateReceivePurchaseOrder(purchaseOrder, request);

        DateTime now = DateTime.UtcNow;
        var receipt = new GoodsReceipt
        {
            Code = $"GR{now:yyyyMMddHHmmssfff}",
            PurchaseOrderId = id,
            Note = request.Note,
            ReceivedBy = userId,
            ReceivedAt = now,
            CreatedDate = now
        };

        foreach (ReceivePurchaseLineRequest receivedLine in request.Lines)
        {
            await ReceivePurchaseLineAsync(purchaseOrder, receipt, receivedLine, userId, now);
        }

        _db.GoodsReceipts.Add(receipt);
        purchaseOrder.PurchaseStatus = AllLinesReceived(purchaseOrder) ? "Received" : "PartiallyReceived";
        purchaseOrder.UpdatedDate = now;

        await _db.SaveChangesAsync();
        return receipt.Id;
    }
    private static void ValidateReceivePurchaseOrder(PurchaseOrder purchaseOrder, ReceivePurchaseOrderRequest request)
    {
        bool canReceive = purchaseOrder.PurchaseStatus == "Approved" ||
                          purchaseOrder.PurchaseStatus == "PartiallyReceived";

        if (!canReceive)
        {
            throw new BusinessOperationsException("Đơn mua chưa sẵn sàng nhận hàng.");
        }

        if (request.Lines == null || request.Lines.Count == 0)
        {
            throw new BusinessOperationsException("Phiếu nhận phải có hàng.");
        }
    }

    private async Task ReceivePurchaseLineAsync(
        PurchaseOrder purchaseOrder,
        GoodsReceipt receipt,
        ReceivePurchaseLineRequest receivedLine,
        int? userId,
        DateTime now)
    {
        PurchaseOrderLine purchaseLine = purchaseOrder.Lines.FirstOrDefault(line => line.Id == receivedLine.PurchaseOrderLineId)
            ?? throw new BusinessOperationsException("Dòng đơn mua không hợp lệ.");

        if (receivedLine.Qty <= 0 || purchaseLine.ReceivedQty + receivedLine.Qty > purchaseLine.OrderedQty)
        {
            throw new BusinessOperationsException("Số lượng nhận vượt số lượng còn lại.");
        }

        purchaseLine.ReceivedQty += receivedLine.Qty;

        receipt.Lines.Add(new GoodsReceiptLine
        {
            PurchaseOrderLineId = purchaseLine.Id,
            SkuId = purchaseLine.SkuId,
            Qty = receivedLine.Qty,
            UnitCost = purchaseLine.UnitCost,
            CreatedDate = now
        });

        InventoryItem inventory = await GetOrCreateInventoryItemAsync(purchaseLine.SkuId, now);
        inventory.OnHand += receivedLine.Qty;
        inventory.UpdatedDate = now;

        _db.StockMovements.Add(new StockMovement
        {
            SkuId = purchaseLine.SkuId,
            Type = (int)StockMovementType.Receipt,
            QtyDelta = receivedLine.Qty,
            BalanceAfter = inventory.OnHand,
            RefType = "GoodsReceipt",
            Reason = receipt.Code,
            PerformedBy = userId,
            OccurredAt = now,
            CreatedDate = now
        });
    }

    private async Task<InventoryItem> GetOrCreateInventoryItemAsync(int skuId, DateTime now)
    {
        InventoryItem? inventory = await _db.InventoryItems.FirstOrDefaultAsync(item => item.SkuId == skuId);

        if (inventory != null)
        {
            return inventory;
        }

        inventory = new InventoryItem
        {
            SkuId = skuId,
            CreatedDate = now
        };

        _db.InventoryItems.Add(inventory);
        return inventory;
    }

    private static bool AllLinesReceived(PurchaseOrder purchaseOrder)
    {
        return purchaseOrder.Lines.All(line => line.ReceivedQty == line.OrderedQty);
    }
}
