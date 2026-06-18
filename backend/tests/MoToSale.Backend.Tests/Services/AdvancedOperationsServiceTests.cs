using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Operations;

namespace MoToSale.Backend.Tests.Services;

public class AdvancedOperationsServiceTests
{
    [Fact]
    public async Task ApproveReturn_RestocksResellableItems_CreatesRefund_AndUpdatesReceivable()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 2);
        var now = DateTime.UtcNow;
        var order = new Order
        {
            Code = "ORDER-RETURN-1", UserId = 2, OrderStatus = OrderStatus.Delivered, PaymentStatus = PaymentStatus.Paid,
            FulfillmentStatus = FulfillmentStatus.Fulfilled, Subtotal = 90_000, GrandTotal = 90_000, RemainingAmount = 0,
            ShippingRecipient = "Customer", ShippingPhone = "0900000000", CreatedDate = now,
            Lines = { new OrderLine { SkuId = skuId, ProductNameSnapshot = "Test product", SkuCodeSnapshot = "SKU", UnitPrice = 90_000, Qty = 1, LineTotal = 90_000, CreatedDate = now } },
        };
        f.Db.Orders.Add(order);
        await f.Db.SaveChangesAsync();
        f.Db.Payments.Add(new Payment { Code = "PAY-1", OrderId = order.Id, Amount = 90_000, PaymentRecordStatus = PaymentRecordStatus.Paid, CreatedDate = now });
        await f.Db.SaveChangesAsync();
        var service = new AdvancedOperationsService(f.Db);

        var id = await service.CreateReturnAsync(new CreateSalesReturnRequest(order.Id, "Customer return", null,
            [new CreateSalesReturnLineRequest(order.Lines.Single().Id, 1, "Resellable")]), 1);
        await service.ApproveReturnAsync(id, new ApproveSalesReturnRequest(90_000, "Cash", null, "Approved"), 1);

        var inventory = await f.Db.InventoryItems.SingleAsync(x => x.SkuId == skuId);
        Assert.Equal(3, inventory.OnHand);
        Assert.Single(f.Db.Refunds.Where(x => x.SalesReturnId == id && x.Amount == 90_000));
        Assert.Single(f.Db.StockMovements.Where(x => x.RefType == "SalesReturn" && x.RefId == id));
        var receivable = Assert.Single(await service.GetReceivablesAsync());
        Assert.Equal(0, receivable.NetPaid);
        Assert.Equal(0, receivable.Outstanding);
    }

    [Fact]
    public async Task UpdateReturn_UpdatesDraftReturnLines()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId1 = await f.SeedSellableSkuAsync(onHand: 2);
        var skuId2 = await f.SeedSellableSkuAsync(onHand: 2);
        var now = DateTime.UtcNow;
        var order = new Order
        {
            Code = "ORDER-RETURN-EDIT", UserId = 2, OrderStatus = OrderStatus.Delivered, PaymentStatus = PaymentStatus.Paid,
            FulfillmentStatus = FulfillmentStatus.Fulfilled, Subtotal = 130_000, GrandTotal = 130_000, RemainingAmount = 0,
            ShippingRecipient = "Customer", ShippingPhone = "0900000000", CreatedDate = now,
            Lines =
            {
                new OrderLine { SkuId = skuId1, ProductNameSnapshot = "First product", SkuCodeSnapshot = "SKU-1", UnitPrice = 50_000, Qty = 1, LineTotal = 50_000, CreatedDate = now },
                new OrderLine { SkuId = skuId2, ProductNameSnapshot = "Second product", SkuCodeSnapshot = "SKU-2", UnitPrice = 40_000, Qty = 2, LineTotal = 80_000, CreatedDate = now },
            },
        };
        f.Db.Orders.Add(order);
        await f.Db.SaveChangesAsync();
        var service = new AdvancedOperationsService(f.Db);

        var id = await service.CreateReturnAsync(new CreateSalesReturnRequest(order.Id, "Original reason", null,
            [new CreateSalesReturnLineRequest(order.Lines.First().Id, 1, "Resellable")]), 1);
        await service.UpdateReturnAsync(id, new UpdateSalesReturnRequest(order.Id, "Updated reason", "Updated note",
            [new CreateSalesReturnLineRequest(order.Lines.Last().Id, 2, "Damaged")]), 1);

        var row = await f.Db.SalesReturns.Include(x => x.Lines).SingleAsync(x => x.Id == id);
        var line = Assert.Single(row.Lines);
        Assert.Equal("Updated reason", row.Reason);
        Assert.Equal("Updated note", row.Note);
        Assert.Equal(order.Lines.Last().Id, line.OrderLineId);
        Assert.Equal(2, line.Qty);
        Assert.Equal("Damaged", line.ItemCondition);
        Assert.Equal(80_000, line.LineTotal);
    }

    [Fact]
    public async Task UpdateReturn_RejectsApprovedReturn()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 2);
        var now = DateTime.UtcNow;
        var order = new Order
        {
            Code = "ORDER-RETURN-LOCKED", UserId = 2, OrderStatus = OrderStatus.Delivered, PaymentStatus = PaymentStatus.Paid,
            FulfillmentStatus = FulfillmentStatus.Fulfilled, Subtotal = 90_000, GrandTotal = 90_000, RemainingAmount = 0,
            ShippingRecipient = "Customer", ShippingPhone = "0900000000", CreatedDate = now,
            Lines = { new OrderLine { SkuId = skuId, ProductNameSnapshot = "Test product", SkuCodeSnapshot = "SKU", UnitPrice = 90_000, Qty = 1, LineTotal = 90_000, CreatedDate = now } },
        };
        f.Db.Orders.Add(order);
        await f.Db.SaveChangesAsync();
        var service = new AdvancedOperationsService(f.Db);

        var id = await service.CreateReturnAsync(new CreateSalesReturnRequest(order.Id, "Customer return", null,
            [new CreateSalesReturnLineRequest(order.Lines.Single().Id, 1, "Resellable")]), 1);
        await service.ApproveReturnAsync(id, new ApproveSalesReturnRequest(0, "Cash", null, "Approved"), 1);

        await Assert.ThrowsAsync<AdvancedOperationsException>(() =>
            service.UpdateReturnAsync(id, new UpdateSalesReturnRequest(order.Id, "Updated reason", null,
                [new CreateSalesReturnLineRequest(order.Lines.Single().Id, 1, "Resellable")]), 1));
    }
}
