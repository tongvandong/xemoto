using MoToSale.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Inventory;

namespace MoToSale.Backend.Tests.Services;

public class InventoryServiceTests
{
    [Fact]
    public async Task StockDocument_CreateApproveAndMovement_UpdatesInventory()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 2);
        var service = f.InventoryService();

        var docId = await service.CreateDocumentAsync(new CreateStockDocumentRequest(
            Type: (int)StockDocumentType.Receipt,
            Note: "E2E receipt",
            Lines: [new StockDocumentLineRequest(skuId, 3, "Add stock")],
            Reason: "Supplement"), userId: 1);

        var draft = await service.GetDocumentAsync(docId);
        Assert.NotNull(draft);
        Assert.Equal(StockDocumentStatus.Draft, draft.Document.Status);
        Assert.Single(draft.Lines);

        await service.ApproveDocumentAsync(docId, userId: 1);

        var approved = await service.GetDocumentAsync(docId);
        Assert.Equal(StockDocumentStatus.Approved, approved!.Document.Status);

        var inventory = await service.GetInventoryAsync(new InventorySearchRequest { Page = 1, PageSize = 20 });
        var row = Assert.Single(inventory.Items, x => x.SkuId == skuId);
        Assert.Equal(5, row.OnHand);
        Assert.Equal(5, row.Available);

        var movements = await service.GetMovementsAsync(skuId);
        Assert.Contains(movements, x => x.RefId == docId && x.QtyDelta == 3 && x.BalanceAfter == 5);
    }

    [Fact]
    public async Task CancelDocument_OnlyWorksForDraft()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync();
        var service = f.InventoryService();

        var docId = await service.CreateDocumentAsync(new CreateStockDocumentRequest(
            (int)StockDocumentType.Receipt,
            "Draft cancel",
            [new StockDocumentLineRequest(skuId, 1, null)],
            "OpeningBalance"), 1);

        await service.CancelDocumentAsync(docId);

        var doc = await service.GetDocumentAsync(docId);
        Assert.Equal(StockDocumentStatus.Cancelled, doc!.Document.Status);
        await Assert.ThrowsAsync<InventoryException>(() => service.CancelDocumentAsync(docId));
    }
}
