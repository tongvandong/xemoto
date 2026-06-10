using MoToSale.DTO.Ordering;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Ordering;

namespace MoToSale.Backend.Tests.Services;

public class VoucherServiceTests
{
    [Fact]
    public async Task VoucherLifecycle_ValidatesDiscountAndDelete()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = f.VoucherService();

        var id = await service.CreateAsync(new SaveVoucherRequest(
            "SALE100",
            "Amount discount",
            "Amount",
            100_000,
            null,
            500_000,
            10,
            1,
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            1));

        var invalid = await service.ValidateAsync("SALE100", 400_000);
        Assert.False(invalid.Valid);

        await service.UpdateAsync(id, new SaveVoucherRequest(
            "SALE10",
            "Percent discount",
            "Percent",
            10,
            75_000,
            100_000,
            10,
            1,
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            1));

        var valid = await service.ValidateAsync("SALE10", 1_000_000);
        Assert.True(valid.Valid);
        Assert.Equal(75_000, valid.DiscountAmount);

        await service.DeleteAsync(id);
        var deleted = await service.ValidateAsync("SALE10", 1_000_000);
        Assert.False(deleted.Valid);
    }

    [Fact]
    public async Task CreateVoucher_RejectsDuplicateCode()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = f.VoucherService();
        var request = new SaveVoucherRequest("DUPSALE", null, "Amount", 10_000, null, 0, null, null, null, null, 1);

        await service.CreateAsync(request);

        await Assert.ThrowsAsync<VoucherException>(() => service.CreateAsync(request));
    }
}
