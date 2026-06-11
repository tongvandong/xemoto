using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Ordering;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;
using MoToSale.Services.Catalog;
using MoToSale.Services.Content;
using MoToSale.Services.Inventory;
using MoToSale.Services.Ordering;

namespace MoToSale.Backend.Tests.TestSupport;

public sealed class TestBackendFactory
{
    public AppDbContext Db { get; }

    public TestBackendFactory()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"motosale-test-{Guid.NewGuid():N}")
            .Options;
        Db = new AppDbContext(options);
    }

    public async Task SeedCoreAsync()
    {
        var now = DateTime.UtcNow;
        Db.Roles.AddRange(
            new Role { Id = 1, Code = RoleConstant.Admin, Name = "Administrator", CreatedDate = now },
            new Role { Id = 2, Code = RoleConstant.Staff, Name = "Staff", CreatedDate = now },
            new Role { Id = 3, Code = RoleConstant.Customer, Name = "Customer", CreatedDate = now });
        Db.Users.AddRange(
            new User { Id = 1, FullName = "Admin", Email = "admin@test.local", PasswordHash = "x", CreatedDate = now },
            new User { Id = 2, FullName = "Customer", Email = "customer@test.local", PasswordHash = "x", CreatedDate = now });
        Db.UserRoles.AddRange(
            new UserRole { UserId = 1, RoleId = 1 },
            new UserRole { UserId = 1, RoleId = 2 },
            new UserRole { UserId = 2, RoleId = 3 });
        Db.Categories.AddRange(
            new Category { Id = 10, Name = "Motorcycles", Slug = "motorcycles", Kind = (int)ProductKind.Motorcycle, SortOrder = 1, CreatedDate = now },
            new Category { Id = 11, Name = "Parts", Slug = "parts", Kind = (int)ProductKind.Part, SortOrder = 2, CreatedDate = now },
            new Category { Id = 12, ParentId = 11, Name = "Oil", Slug = "oil", Kind = (int)ProductKind.Part, SortOrder = 3, CreatedDate = now });
        Db.Brands.Add(new Brand { Id = 20, Name = "Honda", Slug = "honda", CreatedDate = now });
        Db.VehicleModels.Add(new VehicleModel { Id = 21, BrandId = 20, Name = "Air Blade", Slug = "air-blade", CreatedDate = now });
        Db.Manufacturers.Add(new Manufacturer { Id = 30, Name = "Motul", CreatedDate = now });
        await Db.SaveChangesAsync();
    }

    public async Task<int> SeedSellableSkuAsync(int onHand = 5)
    {
        var now = DateTime.UtcNow;
        var product = new Product
        {
            Code = $"TEST-{Guid.NewGuid():N}"[..18],
            Name = "Test product",
            Slug = $"test-product-{Guid.NewGuid():N}",
            CategoryId = 12,
            Kind = (int)ProductKind.Part,
            ManufacturerId = 30,
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
        };
        product.Skus.Add(new Sku
        {
            SkuCode = $"SKU-{Guid.NewGuid():N}"[..18],
            VariantName = "Default",
            ListPrice = 100_000,
            SalePrice = 90_000,
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
        });
        Db.Products.Add(product);
        await Db.SaveChangesAsync();

        var skuId = product.Skus.Single().Id;
        Db.InventoryItems.Add(new InventoryItem { SkuId = skuId, OnHand = onHand, Reserved = 0, ReorderPoint = 1, CreatedDate = now });
        await Db.SaveChangesAsync();
        return skuId;
    }

    public CatalogService CatalogService() => new(
        new ProductRepository(Db),
        new Repository<Category>(Db),
        new Repository<Brand>(Db),
        new Repository<VehicleModel>(Db),
        new SkuRepository(Db),
        new ProductImageRepository(Db),
        new Repository<PartCompatibility>(Db),
        new Repository<Manufacturer>(Db),
        new InventoryRepository(Db),
        Db);

    public VoucherService VoucherService() => new(new VoucherRepository(Db));

    public InventoryService InventoryService() => new(
        new InventoryRepository(Db),
        new StockDocumentRepository(Db),
        new ReservationRepository(Db),
        Db);

    public ContentService ContentService() => new(
        new Repository<MoToSale.Entities.Content.Post>(Db),
        new Repository<MoToSale.Entities.Content.Faq>(Db),
        new Repository<MoToSale.Entities.Content.ContactRequest>(Db),
        new Repository<MoToSale.Entities.Content.HomeBanner>(Db));

    public OrderService OrderService() => new(
        new CartRepository(Db),
        new NoOpUnitOfWork(),
        new OrderRepository(Db),
        new ReservationRepository(Db),
        new InventoryRepository(Db),
        new Repository<Sku>(Db),
        new Repository<Product>(Db),
        VoucherService(),
        new VoucherRepository(Db),
        new Repository<User>(Db),
        new PaymentRepository(Db),
        Db);
}
