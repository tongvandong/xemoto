using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Ordering;

namespace MoToSale.Repository;

// Seed khuyến mãi: Voucher và VoucherScope.
public static partial class SeedConfiguration
{
    private static async Task AddMissingVouchersAsync(AppDbContext db, DateTime now)
    {
        var existing = await db.Vouchers.Select(x => x.Code).ToListAsync();
        var rows = new[]
        {
            new Voucher { Code = "WELCOME200", Description = "Giảm 200.000đ cho khách hàng mới", DiscountType = "Amount", DiscountValue = 200_000, MinOrderValue = 2_000_000, UsageLimit = 500, PerUserLimit = 1, StartAt = now.AddDays(-10), EndAt = now.AddMonths(3), CreatedDate = now },
            new Voucher { Code = "PHUTUNG10", Description = "Giảm 10% phụ tùng, tối đa 300.000đ", DiscountType = "Percent", DiscountValue = 10, MaxDiscount = 300_000, MinOrderValue = 500_000, UsageLimit = 200, PerUserLimit = 2, StartAt = now.AddDays(-5), EndAt = now.AddMonths(2), CreatedDate = now },
            new Voucher { Code = "HE2026", Description = "Ưu đãi mùa hè 1.000.000đ khi mua xe", DiscountType = "Amount", DiscountValue = 1_000_000, MinOrderValue = 25_000_000, UsageLimit = 100, PerUserLimit = 1, StartAt = now.AddDays(-3), EndAt = now.AddMonths(1), CreatedDate = now },
        };
        db.Vouchers.AddRange(rows.Where(x => !existing.Contains(x.Code)));
    }

    private static async Task AddMissingVoucherScopesAsync(AppDbContext db, DateTime now)
    {
        if (await db.VoucherScopes.AnyAsync()) return;
        var vouchers = await db.Vouchers.ToDictionaryAsync(x => x.Code);
        var categories = await db.Categories.ToDictionaryAsync(x => x.Slug);
        db.VoucherScopes.AddRange(
            new VoucherScope { VoucherId = vouchers["PHUTUNG10"].Id, ScopeType = "Category", RefId = categories["phu-tung"].Id, CreatedDate = now },
            new VoucherScope { VoucherId = vouchers["HE2026"].Id, ScopeType = "Category", RefId = categories["xe-may"].Id, CreatedDate = now });
    }
}
