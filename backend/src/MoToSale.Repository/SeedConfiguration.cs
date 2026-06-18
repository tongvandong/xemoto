using MoToSale.Common;

namespace MoToSale.Repository;

/// <summary>Khởi tạo dữ liệu mặc định (theo khuôn BaseCore.Entities.SeedConfiguration).</summary>
public static partial class SeedConfiguration
{
    public static async Task RunAsync(AppDbContext db, IPasswordHasher hasher)
    {
        await UserSeedConfiguration.RunAsync(db, hasher);
    }

    public static async Task SeedCatalogAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;

        await AddMissingBrandsAsync(db, now);
        await db.SaveChangesAsync();
        await AddMissingModelsAsync(db, now);
        await AddMissingCategoriesAsync(db, now);
        await db.SaveChangesAsync();
        await AddMissingManufacturersAsync(db, now);
        await db.SaveChangesAsync();

        await AddMissingProductsAsync(db, now);
        await db.SaveChangesAsync();
        await AddMissingSkusAsync(db, now);
        await db.SaveChangesAsync();

        await AddMissingInventoryAsync(db, now);
        await AddMissingVouchersAsync(db, now);
        await AddMissingContentAsync(db, now);
        await AddMissingCompatibilitiesAsync(db, now);
        await db.SaveChangesAsync();
        await AddMissingVoucherScopesAsync(db, now);
        await db.SaveChangesAsync();
        // Đã tắt seed đơn hàng/đánh giá/bảo hành DEMO: cửa hàng vận hành bằng dữ liệu thật
        // (sản phẩm coi như vốn có sẵn đầu kỳ, nhập kho qua phiếu nhập). Bật lại nếu cần dữ liệu demo.
        // await AddMissingOperationalDataAsync(db, now);
        // await db.SaveChangesAsync();
    }
}
