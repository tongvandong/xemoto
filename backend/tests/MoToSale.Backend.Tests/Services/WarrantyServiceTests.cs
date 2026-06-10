using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Ordering;

namespace MoToSale.Backend.Tests.Services;

public class WarrantyServiceTests
{
    [Fact]
    public async Task WarrantyWorkflow_CreatesHistoryAndCompletionCost()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = new WarrantyService(new Repository<Warranty>(f.Db), new Repository<WarrantyHistory>(f.Db));

        var id = await service.CreateAsync(new SaveWarrantyRequest(
            OrderId: null, SkuId: null, CustomerId: 2, ProductSnapshot: "Air Blade",
            SerialNumber: "SERIAL-1", StartAt: DateTime.UtcNow.Date, Months: 24, Note: "Receive",
            CustomerName: "Customer", CustomerPhone: "0900000000", FrameNumber: "FRAME-1",
            EngineNumber: "ENGINE-1", ReportedIssue: "Engine noise", EstimatedCost: 500_000));
        await service.UpdateStatusAsync(id, new UpdateWarrantyStatusRequest("Processing", "Inspect", null), 1);
        await service.UpdateStatusAsync(id, new UpdateWarrantyStatusRequest("Completed", "Fixed", 350_000), 1);

        var detail = await service.GetAsync(id);
        Assert.NotNull(detail);
        Assert.Equal("Completed", detail.Warranty.WarrantyStatus);
        Assert.Equal(350_000, detail.Warranty.ActualCost);
        Assert.NotNull(detail.Warranty.CompletedAt);
        Assert.Equal(3, detail.Histories.Count());
    }
}
