using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Operations;
using MoToSale.Services.Operations;
using MoToSale.Backend.Tests.TestSupport;

namespace MoToSale.Backend.Tests.Services;

public class BusinessOperationsServiceTests
{
    [Fact]
    public async Task ReceivePurchase_RestocksInventory_AndCompletesPurchase()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 3);
        var service = new BusinessOperationsService(f.Db);
        var supplierId = await service.SaveSupplierAsync(null, new SupplierRequest("SUP-1", "Supplier", null, null, null, null, null, null));
        var purchaseId = await service.CreatePurchaseOrderAsync(new CreatePurchaseOrderRequest(supplierId, "test",
            [new PurchaseLineRequest(skuId, 2, 50_000)]), 1);
        await service.ApprovePurchaseOrderAsync(purchaseId, 1);
        var lineId = await f.Db.PurchaseOrderLines.Where(x => x.PurchaseOrderId == purchaseId).Select(x => x.Id).SingleAsync();

        await service.ReceivePurchaseOrderAsync(purchaseId, new ReceivePurchaseOrderRequest("received",
            [new ReceivePurchaseLineRequest(lineId, 2)]), 1);

        Assert.Equal("Received", (await f.Db.PurchaseOrders.FindAsync(purchaseId))!.PurchaseStatus);
        Assert.Equal(5, (await f.Db.InventoryItems.SingleAsync(x => x.SkuId == skuId)).OnHand);
        Assert.Single(f.Db.StockMovements.Where(x => x.RefType == "GoodsReceipt" && x.SkuId == skuId && x.QtyDelta == 2));
    }

    [Fact]
    public async Task ReceivePurchase_RejectsQuantityAboveRemaining()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync();
        var service = new BusinessOperationsService(f.Db);
        var supplierId = await service.SaveSupplierAsync(null, new SupplierRequest("SUP-2", "Supplier", null, null, null, null, null, null));
        var purchaseId = await service.CreatePurchaseOrderAsync(new CreatePurchaseOrderRequest(supplierId, null,
            [new PurchaseLineRequest(skuId, 1, 10)]), 1);
        await service.ApprovePurchaseOrderAsync(purchaseId, 1);
        var lineId = await f.Db.PurchaseOrderLines.Where(x => x.PurchaseOrderId == purchaseId).Select(x => x.Id).SingleAsync();

        await Assert.ThrowsAsync<BusinessOperationsException>(() =>
            service.ReceivePurchaseOrderAsync(purchaseId, new ReceivePurchaseOrderRequest(null, [new ReceivePurchaseLineRequest(lineId, 2)]), 1));
    }

    [Fact]
    public async Task CrmAndAttendance_CompleteOperationalFlow()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = new BusinessOperationsService(f.Db);

        var interactionId = await service.CreateInteractionAsync(new CustomerInteractionRequest(2, 1, "Call", "Follow up", null, DateTime.UtcNow.AddDays(1)));
        await service.CompleteInteractionAsync(interactionId);
        var attendanceId = await service.CheckInAsync(new AttendanceRequest(1, "Morning"));
        await service.CheckOutAsync(attendanceId);

        Assert.Equal("Completed", (await f.Db.CustomerInteractions.FindAsync(interactionId))!.InteractionStatus);
        Assert.NotNull((await f.Db.StaffAttendances.FindAsync(attendanceId))!.CheckOutAt);
    }

    [Fact]
    public async Task PayPurchase_UpdatesOutstanding_AndCreatesCashPayment()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync();
        var service = new BusinessOperationsService(f.Db);
        var supplierId = await service.SaveSupplierAsync(null, new SupplierRequest("SUP-3", "Supplier", null, null, null, null, null, null));
        var purchaseId = await service.CreatePurchaseOrderAsync(new CreatePurchaseOrderRequest(supplierId, null, [new PurchaseLineRequest(skuId, 2, 50_000)]), 1);
        await service.ApprovePurchaseOrderAsync(purchaseId, 1);

        await service.PayPurchaseOrderAsync(purchaseId, new PayPurchaseOrderRequest(40_000, "Cash", "First payment"), 1);

        Assert.Equal(40_000, (await f.Db.PurchaseOrders.FindAsync(purchaseId))!.PaidAmount);
        Assert.Single(f.Db.CashTransactions.Where(x => x.ReferenceType == "PurchaseOrder" && x.ReferenceId == purchaseId && x.TransactionType == "Payment"));
    }

    [Fact]
    public async Task StartRepair_IssuesPartsOnce_AndWritesTimeline()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 5);
        var service = new BusinessOperationsService(f.Db);
        var repairId = await service.CreateRepairAsync(new CreateRepairOrderRequest(2, 1, null, "Test bike", "Test issue", 10_000, null, [new RepairLineRequest(skuId, "Part", 2, 20_000)]));

        await service.UpdateRepairStatusAsync(repairId, new UpdateRepairStatusRequest("Inspecting", "Inspect"));
        await service.UpdateRepairStatusAsync(repairId, new UpdateRepairStatusRequest("Quoted", "Quote"));
        await service.UpdateRepairStatusAsync(repairId, new UpdateRepairStatusRequest("Repairing", "Start"));

        Assert.Equal(3, (await f.Db.InventoryItems.SingleAsync(x => x.SkuId == skuId)).OnHand);
        Assert.True((await f.Db.RepairOrders.FindAsync(repairId))!.PartsIssued);
        Assert.Equal(4, await f.Db.RepairStatusHistories.CountAsync(x => x.RepairOrderId == repairId));
        Assert.Single(f.Db.StockMovements.Where(x => x.RefType == "RepairOrder" && x.RefId == repairId && x.QtyDelta == -2));
    }
}
