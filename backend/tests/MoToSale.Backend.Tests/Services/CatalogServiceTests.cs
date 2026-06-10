using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Catalog;

namespace MoToSale.Backend.Tests.Services;

public class CatalogServiceTests
{
    [Fact]
    public async Task CreateUpdateDeleteProduct_UsesEnglishSchemaAndSoftDeletes()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = f.CatalogService();

        var productId = await service.CreateProductAsync(new CreateProductRequest(
            Code: "PART-E2E-01",
            Name: "Brake pad test",
            Slug: "brake-pad-test",
            CategoryId: 12,
            BrandId: 20,
            VehicleModelId: 21,
            Kind: (int)ProductKind.Part,
            ShortDescription: "Short",
            Description: "Long",
            IsFeatured: true,
            IsHotDeal: false,
            ListPrice: 120_000,
            SalePrice: 110_000,
            ManufacturerId: 30));

        var created = await service.GetProductAsync(productId);
        Assert.NotNull(created);
        Assert.Equal("PART-E2E-01", created.Code);
        Assert.Null(created.BrandId);
        Assert.Null(created.VehicleModelId);
        Assert.Equal(30, created.ManufacturerId);
        Assert.Single(created.Skus);

        await service.UpdateProductAsync(productId, new UpdateProductRequest(
            Name: "Brake pad updated",
            Slug: "brake-pad-updated",
            CategoryId: 12,
            BrandId: 20,
            VehicleModelId: 21,
            ShortDescription: "Short updated",
            Description: "Long updated",
            IsFeatured: false,
            IsHotDeal: true,
            ListPrice: 120_000,
            SalePrice: 110_000,
            Status: (int)EntityStatus.Active,
            ManufacturerId: 30));

        var skuId = await service.CreateSkuAsync(productId, new CreateSkuRequest("PART-E2E-01-RED", "Red", "Red", "V1", 130_000, 125_000, "BAR-1"));
        await service.UpdateSkuAsync(productId, skuId, new UpdateSkuRequest("PART-E2E-01-BLUE", "Blue", "Blue", "V2", 140_000, 135_000, "BAR-2", (int)EntityStatus.Active));
        await service.DeleteSkuAsync(productId, skuId);

        await service.DeleteProductAsync(productId);

        var deleted = await service.GetProductAsync(productId);
        Assert.NotNull(deleted);
        Assert.Equal((int)EntityStatus.Inactive, deleted.Status);
        Assert.Equal("Brake pad updated", deleted.Name);
        Assert.True(deleted.IsHotDeal);
    }

    [Fact]
    public async Task CreateProduct_RejectsDuplicateProductCode()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var service = f.CatalogService();
        var request = new CreateProductRequest("DUP-001", "First", "dup-001", 12, null, null, (int)ProductKind.Part, null, null, false, false, 10_000, null, 30);

        await service.CreateProductAsync(request);

        await Assert.ThrowsAsync<CatalogException>(() => service.CreateProductAsync(request));
    }
}
