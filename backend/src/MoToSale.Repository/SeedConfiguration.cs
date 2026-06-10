using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Helpers;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Content;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository.Seeds;

namespace MoToSale.Repository;

/// <summary>Khởi tạo dữ liệu mặc định (theo khuôn BaseCore.Entities.SeedConfiguration).</summary>
public static class SeedConfiguration
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
        await AddMissingOperationalDataAsync(db, now);
        await db.SaveChangesAsync();
    }

    private static async Task AddMissingBrandsAsync(AppDbContext db, DateTime now)
    {
        var existing = await db.Brands.Select(x => x.Slug).ToListAsync();
        var rows = new[]
        {
            new Brand { Name = "Honda", Slug = "honda", CreatedDate = now },
            new Brand { Name = "Yamaha", Slug = "yamaha", CreatedDate = now },
            new Brand { Name = "Suzuki", Slug = "suzuki", CreatedDate = now },
            new Brand { Name = "Piaggio", Slug = "piaggio", CreatedDate = now },
            new Brand { Name = "SYM", Slug = "sym", CreatedDate = now },
        };
        db.Brands.AddRange(rows.Where(x => !existing.Contains(x.Slug)));
    }

    private static async Task AddMissingModelsAsync(AppDbContext db, DateTime now)
    {
        var brands = await db.Brands.ToDictionaryAsync(x => x.Slug);
        var existing = await db.VehicleModels.Select(x => x.Slug).ToListAsync();
        var rows = new[]
        {
            ("honda", "Vision", "honda-vision"), ("honda", "Air Blade", "honda-air-blade"),
            ("honda", "Winner X", "honda-winner-x"), ("honda", "Wave Alpha", "honda-wave-alpha"),
            ("yamaha", "Exciter", "yamaha-exciter"), ("yamaha", "Janus", "yamaha-janus"),
            ("yamaha", "Grande", "yamaha-grande"), ("suzuki", "Raider", "suzuki-raider"),
            ("piaggio", "Vespa Sprint", "piaggio-vespa-sprint"), ("sym", "Elegant", "sym-elegant"),
        };
        db.VehicleModels.AddRange(rows.Where(x => !existing.Contains(x.Item3))
            .Select(x => new VehicleModel { BrandId = brands[x.Item1].Id, Name = x.Item2, Slug = x.Item3, CreatedDate = now }));
    }

    private static async Task AddMissingCategoriesAsync(AppDbContext db, DateTime now)
    {
        var existing = await db.Categories.ToDictionaryAsync(x => x.Slug);
        foreach (var root in new[]
        {
            new Category { Name = "Xe máy", Slug = "xe-may", Kind = (int)ProductKind.Motorcycle, SortOrder = 1, CreatedDate = now },
            new Category { Name = "Phụ tùng", Slug = "phu-tung", Kind = (int)ProductKind.Part, SortOrder = 2, CreatedDate = now },
        })
        {
            if (!existing.ContainsKey(root.Slug)) { db.Categories.Add(root); existing[root.Slug] = root; }
        }
        await db.SaveChangesAsync();

        var children = new[]
        {
            ("xe-may", "Xe tay ga", "xe-tay-ga", ProductKind.Motorcycle, 1),
            ("xe-may", "Xe số", "xe-so", ProductKind.Motorcycle, 2),
            ("xe-may", "Xe côn tay", "xe-con-tay", ProductKind.Motorcycle, 3),
            ("phu-tung", "Dầu nhớt", "dau-nhot", ProductKind.Part, 1),
            ("phu-tung", "Lốp xe", "lop-xe", ProductKind.Part, 2),
            ("phu-tung", "Phanh và má phanh", "phanh-ma-phanh", ProductKind.Part, 3),
            ("phu-tung", "Ắc quy", "ac-quy", ProductKind.Part, 4),
            ("phu-tung", "Phụ kiện", "phu-kien", ProductKind.Part, 5),
        };
        db.Categories.AddRange(children.Where(x => !existing.ContainsKey(x.Item3)).Select(x =>
            new Category { ParentId = existing[x.Item1].Id, Name = x.Item2, Slug = x.Item3, Kind = (int)x.Item4, SortOrder = x.Item5, CreatedDate = now }));
    }

    private static async Task AddMissingManufacturersAsync(AppDbContext db, DateTime now)
    {
        var existing = await db.Manufacturers.Select(x => x.Name).ToListAsync();
        var rows = new[]
        {
            new Manufacturer { Name = "Honda Genuine Parts", LogoUrl = null, Description = "Phụ tùng và dầu nhớt chính hãng Honda.", CreatedDate = now },
            new Manufacturer { Name = "Motul", LogoUrl = null, Description = "Dầu nhớt và dung dịch bảo dưỡng xe máy.", CreatedDate = now },
            new Manufacturer { Name = "Michelin", LogoUrl = null, Description = "Lốp xe máy và phụ kiện lốp.", CreatedDate = now },
            new Manufacturer { Name = "GS Yuasa", LogoUrl = null, Description = "Ắc quy xe máy.", CreatedDate = now },
            new Manufacturer { Name = "MoToSale", LogoUrl = null, Description = "Phụ kiện cửa hàng phân phối.", CreatedDate = now },
        };

        foreach (var row in rows)
        {
            var current = await db.Manufacturers.FirstOrDefaultAsync(x => x.Name == row.Name);
            if (current is not null)
            {
                if (current.LogoUrl?.Contains("logo.clearbit.com", StringComparison.OrdinalIgnoreCase) == true)
                {
                    current.LogoUrl = null;
                    current.UpdatedDate = now;
                }

                if (string.IsNullOrWhiteSpace(current.LogoUrl) && !string.IsNullOrWhiteSpace(row.LogoUrl))
                {
                    current.LogoUrl = row.LogoUrl;
                    current.UpdatedDate = now;
                }

                if (string.IsNullOrWhiteSpace(current.Description) && !string.IsNullOrWhiteSpace(row.Description))
                {
                    current.Description = row.Description;
                    current.UpdatedDate = now;
                }
            }
        }

        db.Manufacturers.AddRange(rows.Where(x => !existing.Contains(x.Name)));
    }

    private static async Task AddMissingProductsAsync(AppDbContext db, DateTime now)
    {
        var categories = await db.Categories.ToDictionaryAsync(x => x.Slug);
        var brands = await db.Brands.ToDictionaryAsync(x => x.Slug);
        var models = await db.VehicleModels.ToDictionaryAsync(x => x.Slug);
        var manufacturers = await db.Manufacturers.ToDictionaryAsync(x => x.Name);
        var existing = await db.Products.Select(x => x.Code).ToListAsync();
        var rows = new[]
        {
            Motorcycle("SP-VISION", "Honda Vision 2024", "honda-vision-2024", "xe-tay-ga", "honda", "honda-vision", true, false,
                Sku("SP-VISION-TC", "Tiêu chuẩn", "Đen", 31_000_000), Sku("SP-VISION-CC", "Cao cấp", "Đỏ", 33_500_000), Sku("SP-VISION-DB", "Đặc biệt", "Xám", 35_000_000)),
            Motorcycle("SP-AB160", "Honda Air Blade 160", "honda-air-blade-160", "xe-tay-ga", "honda", "honda-air-blade", true, true,
                Sku("SP-AB160-TC", "Tiêu chuẩn", "Xanh đen", 57_000_000), Sku("SP-AB160-DB", "Đặc biệt", "Đỏ đen", 59_500_000)),
            Motorcycle("SP-WINNER", "Honda Winner X 2024", "honda-winner-x-2024", "xe-con-tay", "honda", "honda-winner-x", true, true,
                Sku("SP-WINNER-TC", "Tiêu chuẩn", "Đen bạc", 46_000_000, 44_500_000), Sku("SP-WINNER-ABS", "ABS", "Đỏ đen", 50_500_000)),
            Motorcycle("SP-WAVE", "Honda Wave Alpha", "honda-wave-alpha", "xe-so", "honda", "honda-wave-alpha", false, false,
                Sku("SP-WAVE-TC", "Tiêu chuẩn", "Xanh", 19_000_000), Sku("SP-WAVE-DB", "Đặc biệt", "Đen", 20_500_000)),
            Motorcycle("SP-EX155", "Yamaha Exciter 155 VVA", "yamaha-exciter-155-vva", "xe-con-tay", "yamaha", "yamaha-exciter", true, true,
                Sku("SP-EX155-TC", "Tiêu chuẩn", "Đen", 48_000_000), Sku("SP-EX155-ABS", "ABS", "Xanh GP", 54_000_000, 52_500_000)),
            Motorcycle("SP-JANUS", "Yamaha Janus", "yamaha-janus", "xe-tay-ga", "yamaha", "yamaha-janus", false, false,
                Sku("SP-JANUS-TC", "Tiêu chuẩn", "Trắng", 29_000_000), Sku("SP-JANUS-DB", "Đặc biệt", "Đỏ", 33_000_000)),
            Motorcycle("SP-RAIDER", "Suzuki Raider R150", "suzuki-raider-r150", "xe-con-tay", "suzuki", "suzuki-raider", false, false,
                Sku("SP-RAIDER-TC", "Tiêu chuẩn", "Đen đỏ", 46_000_000)),
            Motorcycle("SP-VESPA", "Vespa Sprint 125", "vespa-sprint-125", "xe-tay-ga", "piaggio", "piaggio-vespa-sprint", true, false,
                Sku("SP-VESPA-TC", "Tiêu chuẩn", "Trắng", 82_000_000), Sku("SP-VESPA-S", "S", "Đen", 85_000_000)),
            Part("SP-NHOT", "Nhớt Honda chính hãng", "nhot-honda-chinh-hang", "dau-nhot", "Honda Genuine Parts", true,
                Sku("PT-NHOT-HONDA-08", "Chai 0.8L", null, 120_000, 99_000), Sku("PT-NHOT-HONDA-10", "Chai 1L", null, 145_000)),
            Part("PT-NHOT-MOTUL", "Nhớt Motul 300V", "nhot-motul-300v", "dau-nhot", "Motul", true,
                Sku("PT-MOTUL-300V-1L", "Chai 1L", null, 420_000, 390_000)),
            Part("PT-LOP-MICHELIN", "Lốp Michelin Pilot Street 2", "lop-michelin-pilot-street-2", "lop-xe", "Michelin", true,
                Sku("PT-LOP-MICH-8090", "80/90-14", null, 780_000), Sku("PT-LOP-MICH-9014", "90/90-14", null, 850_000)),
            Part("PT-MAPHANH", "Má phanh đĩa Honda", "ma-phanh-dia-honda", "phanh-ma-phanh", "Honda Genuine Parts", false,
                Sku("PT-MAPHANH-HONDA", "Bộ trước", null, 260_000)),
            Part("PT-ACQUY", "Ắc quy GS GTZ5S", "ac-quy-gs-gtz5s", "ac-quy", "GS Yuasa", false,
                Sku("PT-ACQUY-GTZ5S", "12V 3.5Ah", null, 520_000)),
            Part("PT-MUBAOHOM", "Mũ bảo hiểm 3/4 MoToSale", "mu-bao-hiem-34-motosale", "phu-kien", "MoToSale", true,
                Sku("PT-MBH-DEN-M", "Đen - M", "Đen", 450_000), Sku("PT-MBH-TRANG-L", "Trắng - L", "Trắng", 450_000)),
        };
        db.Products.AddRange(rows.Where(x => !existing.Contains(x.Code)));
        var oldOil = await db.Products.FirstOrDefaultAsync(x => x.Code == "SP-NHOT");
        if (oldOil is not null && oldOil.CategoryId != categories["dau-nhot"].Id)
        {
            oldOil.CategoryId = categories["dau-nhot"].Id;
            oldOil.UpdatedDate = now;
        }

        foreach (var (code, manufacturer) in new[]
        {
            ("SP-NHOT", "Honda Genuine Parts"),
            ("PT-NHOT-MOTUL", "Motul"),
            ("PT-LOP-MICHELIN", "Michelin"),
            ("PT-MAPHANH", "Honda Genuine Parts"),
            ("PT-ACQUY", "GS Yuasa"),
            ("PT-MUBAOHOM", "MoToSale"),
        })
        {
            var product = await db.Products.FirstOrDefaultAsync(x => x.Code == code);
            if (product is not null && product.ManufacturerId != manufacturers[manufacturer].Id)
            {
                product.ManufacturerId = manufacturers[manufacturer].Id;
                product.UpdatedDate = now;
            }
        }

        Product Motorcycle(string code, string name, string slug, string category, string brand, string model, bool featured, bool hotDeal, params Sku[] skus) =>
            new() { Code = code, Name = name, Slug = slug, CategoryId = categories[category].Id, BrandId = brands[brand].Id, VehicleModelId = models[model].Id, Kind = (int)ProductKind.Motorcycle, ShortDescription = $"{name} chính hãng, bảo hành theo tiêu chuẩn nhà sản xuất.", IsFeatured = featured, IsHotDeal = hotDeal, CreatedDate = now, Skus = skus };
        Product Part(string code, string name, string slug, string category, string manufacturer, bool hotDeal, params Sku[] skus) =>
            new() { Code = code, Name = name, Slug = slug, CategoryId = categories[category].Id, ManufacturerId = manufacturers[manufacturer].Id, Kind = (int)ProductKind.Part, ShortDescription = $"{name} dành cho nhu cầu bảo dưỡng và nâng cấp xe.", IsHotDeal = hotDeal, CreatedDate = now, Skus = skus };
        Sku Sku(string code, string variant, string? color, decimal price, decimal? salePrice = null) =>
            new() { SkuCode = code, VariantName = variant, Color = color, ListPrice = price, SalePrice = salePrice, CreatedDate = now };
    }

    private static async Task AddMissingInventoryAsync(AppDbContext db, DateTime now)
    {
        var skus = await db.Skus.OrderBy(x => x.Id).ToListAsync();
        var existing = await db.InventoryItems.Select(x => x.SkuId).ToListAsync();
        var existingSkuIds = existing.ToHashSet();
        var index = 0;
        foreach (var sku in skus)
        {
            if (existingSkuIds.Contains(sku.Id)) continue;
            var onHand = sku.ListPrice > 10_000_000 ? 2 + index % 6 : 12 + index % 35;
            if (index % 11 == 0) onHand = 3;
            var item = new InventoryItem { SkuId = sku.Id, OnHand = onHand, Reserved = 0, ReorderPoint = sku.ListPrice > 10_000_000 ? 2 : 5, CreatedDate = now };
            db.InventoryItems.Add(item);
            db.StockMovements.Add(new StockMovement { SkuId = sku.Id, Type = (int)StockMovementType.Receipt, QtyDelta = onHand, BalanceAfter = onHand, RefType = "Seed", Reason = "Tồn đầu kỳ dữ liệu mẫu", OccurredAt = now, CreatedDate = now });
            index++;
        }
    }

    private static async Task AddMissingSkusAsync(AppDbContext db, DateTime now)
    {
        var products = await db.Products.ToDictionaryAsync(x => x.Code);
        var existing = await db.Skus.Select(x => x.SkuCode).ToListAsync();
        var rows = new[]
        {
            Sku("SP-VISION", "SP-VISION-CC", "Cao cấp", "Đỏ", 33_500_000),
            Sku("SP-VISION", "SP-VISION-DB", "Đặc biệt", "Xám", 35_000_000),
            Sku("SP-WINNER", "SP-WINNER-ABS", "ABS", "Đỏ đen", 50_500_000),
            Sku("SP-NHOT", "PT-NHOT-HONDA-10", "Chai 1L", null, 145_000),
        };
        db.Skus.AddRange(rows.Where(x => !existing.Contains(x.SkuCode)));

        Sku Sku(string productCode, string code, string variant, string? color, decimal price) =>
            new() { ProductId = products[productCode].Id, SkuCode = code, VariantName = variant, Color = color, ListPrice = price, CreatedDate = now };
    }

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

    private static async Task AddMissingContentAsync(AppDbContext db, DateTime now)
    {
        var postSlugs = await db.Posts.Select(x => x.Slug).ToListAsync();
        var authorId = await db.Users.Where(x => x.Email == "admin@motosale.local").Select(x => (int?)x.Id).FirstOrDefaultAsync();
        var posts = new[]
        {
            new Post { Title = "Kinh nghiệm chọn xe máy đi làm hằng ngày", Slug = "kinh-nghiem-chon-xe-may-di-lam", Summary = "Các tiêu chí cần cân nhắc khi chọn xe đi làm.", Body = "Ưu tiên mức tiêu hao nhiên liệu, tư thế lái, chi phí bảo dưỡng và nhu cầu di chuyển thực tế.", Category = "Tư vấn mua xe", PostStatus = "Published", PublishedAt = now.AddDays(-12), AuthorId = authorId, CreatedDate = now },
            new Post { Title = "Khi nào nên thay dầu nhớt xe máy?", Slug = "khi-nao-nen-thay-dau-nhot-xe-may", Summary = "Lịch thay nhớt giúp xe vận hành ổn định.", Body = "Kiểm tra hướng dẫn của nhà sản xuất và điều kiện sử dụng thực tế để chọn chu kỳ thay nhớt phù hợp.", Category = "Bảo dưỡng", PostStatus = "Published", PublishedAt = now.AddDays(-8), AuthorId = authorId, CreatedDate = now },
            new Post { Title = "Những dấu hiệu cần kiểm tra má phanh", Slug = "dau-hieu-can-kiem-tra-ma-phanh", Summary = "Chủ động kiểm tra để đảm bảo an toàn.", Body = "Âm thanh bất thường, hành trình phanh dài và cảm giác phanh kém là những dấu hiệu cần kiểm tra sớm.", Category = "Bảo dưỡng", PostStatus = "Draft", AuthorId = authorId, CreatedDate = now },
        };
        db.Posts.AddRange(posts.Where(x => !postSlugs.Contains(x.Slug)));

        if (!await db.Faqs.AnyAsync())
        {
            db.Faqs.AddRange(
                new Faq { Question = "Cửa hàng có hỗ trợ trả góp không?", Answer = "Có. Nhân viên sẽ tư vấn hồ sơ và phương án phù hợp tại showroom.", Category = "Thanh toán", SortOrder = 1, CreatedDate = now },
                new Faq { Question = "Phụ tùng có được bảo hành không?", Answer = "Chính sách bảo hành phụ thuộc từng loại phụ tùng và nhà sản xuất.", Category = "Bảo hành", SortOrder = 2, CreatedDate = now },
                new Faq { Question = "Có thể nhận xe tại showroom không?", Answer = "Có. Khách hàng có thể chọn nhận tại showroom khi đặt hàng.", Category = "Giao nhận", SortOrder = 3, CreatedDate = now });
        }
        if (!await db.ContactRequests.AnyAsync())
        {
            db.ContactRequests.AddRange(
                new ContactRequest { FullName = "Nguyễn Minh Anh", Phone = "0909123456", Email = "minhanh@example.com", Subject = "Tư vấn xe tay ga", Body = "Tôi cần tư vấn xe tay ga đi làm trong thành phố.", Type = "Consultation", ContactStatus = "New", CreatedDate = now.AddDays(-2) },
                new ContactRequest { FullName = "Trần Quốc Huy", Phone = "0912233445", Subject = "Đăng ký lái thử", Body = "Tôi muốn lái thử Winner X cuối tuần.", Type = "TestDrive", ContactStatus = "New", CreatedDate = now.AddDays(-1) });
        }
        if (!await db.HomeBanners.AnyAsync())
        {
            db.HomeBanners.AddRange(
                new HomeBanner { Position = "Slider", Title = "Khám phá xe máy chính hãng", ImageUrl = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=80", Link = "/motorcycles", SortOrder = 1, CreatedDate = now },
                new HomeBanner { Position = "Slider", Title = "Phụ tùng và bảo dưỡng", ImageUrl = "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80", Link = "/parts", SortOrder = 2, CreatedDate = now });
        }
    }

    private static async Task AddMissingCompatibilitiesAsync(AppDbContext db, DateTime now)
    {
        if (await db.PartCompatibilities.AnyAsync()) return;
        var products = await db.Products.ToDictionaryAsync(x => x.Code);
        var brands = await db.Brands.ToDictionaryAsync(x => x.Slug);
        var models = await db.VehicleModels.ToDictionaryAsync(x => x.Slug);
        db.PartCompatibilities.AddRange(
            new PartCompatibility { PartProductId = products["PT-LOP-MICHELIN"].Id, BrandId = brands["honda"].Id, VehicleModelId = models["honda-air-blade"].Id, YearFrom = 2020, YearTo = 2026, Note = "Phù hợp bánh 14 inch Air Blade", CreatedDate = now },
            new PartCompatibility { PartProductId = products["PT-MAPHANH"].Id, BrandId = brands["honda"].Id, VehicleModelId = models["honda-winner-x"].Id, YearFrom = 2021, YearTo = 2026, Note = "Má phanh đĩa trước", CreatedDate = now },
            new PartCompatibility { PartProductId = products["PT-NHOT-MOTUL"].Id, AppliesToAll = true, Note = "Dùng cho xe máy 4 thì theo khuyến nghị kỹ thuật", CreatedDate = now });
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

    private static async Task AddMissingOperationalDataAsync(AppDbContext db, DateTime now)
    {
        if (await db.Orders.AnyAsync(x => x.Code.StartsWith("DEMO-"))) return;

        var users = await db.Users.ToDictionaryAsync(x => x.Email);
        var skuRows = await (from sku in db.Skus
                             join product in db.Products on sku.ProductId equals product.Id
                             select new { sku.Id, sku.SkuCode, ProductName = product.Name, Price = sku.SalePrice ?? sku.ListPrice })
            .ToDictionaryAsync(x => x.SkuCode);
        var staffId = users["staff@motosale.local"].Id;

        var orders = new[]
        {
            Order("DEMO-2026-001", "customer@motosale.local", OrderStatus.Pending, PaymentStatus.Unpaid, FulfillmentStatus.Unallocated, 0, 0, "SP-VISION-TC"),
            Order("DEMO-2026-002", "minhanh@example.com", OrderStatus.Pending, PaymentStatus.Paid, FulfillmentStatus.Unallocated, 1, 200_000, "PT-LOP-MICH-8090", "PT-MAPHANH-HONDA"),
            Order("DEMO-2026-003", "quochuy@example.com", OrderStatus.Shipping, PaymentStatus.Paid, FulfillmentStatus.Shipped, 3, 1_000_000, "SP-EX155-ABS"),
            Order("DEMO-2026-004", "hoangnam@example.com", OrderStatus.Delivered, PaymentStatus.Paid, FulfillmentStatus.Fulfilled, 8, 0, "SP-AB160-TC"),
            Order("DEMO-2026-005", "thutrang@example.com", OrderStatus.Delivered, PaymentStatus.Paid, FulfillmentStatus.Fulfilled, 15, 0, "SP-WAVE-TC", "PT-NHOT-HONDA-10"),
            Order("DEMO-2026-006", "customer@motosale.local", OrderStatus.Cancelled, PaymentStatus.Unpaid, FulfillmentStatus.Unallocated, 5, 0, "PT-MBH-DEN-M"),
        };
        db.Orders.AddRange(orders);
        await db.SaveChangesAsync();

        foreach (var order in orders)
        {
            db.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = order.Id, ToStatus = OrderStatus.Pending, Note = "Tạo đơn dữ liệu mẫu", ChangedBy = order.UserId, CreatedDate = order.CreatedDate });
            if (order.OrderStatus != OrderStatus.Pending)
                db.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = order.Id, FromStatus = OrderStatus.Pending, ToStatus = order.OrderStatus, Note = "Cập nhật trạng thái dữ liệu mẫu", ChangedBy = staffId, CreatedDate = order.CreatedDate.AddHours(3) });
            if (order.PaymentStatus == PaymentStatus.Paid)
                db.Payments.Add(new Payment { Code = $"PAY-{order.Code}", OrderId = order.Id, PaymentType = PaymentRecordType.Full, Amount = order.GrandTotal, Method = order.Id % 2 == 0 ? PaymentMethod.BankTransfer : PaymentMethod.Cash, PaymentRecordStatus = PaymentRecordStatus.Paid, RecordedBy = staffId, PaidAt = order.CreatedDate.AddHours(2), CreatedDate = order.CreatedDate.AddHours(2), Note = "Thanh toán dữ liệu mẫu" });
        }
        await db.SaveChangesAsync();

        var delivered = orders.First(x => x.Code == "DEMO-2026-004");
        var deliveredLine = delivered.Lines.First();
        db.Reviews.Add(new Review { ProductId = (await db.Skus.FindAsync(deliveredLine.SkuId))!.ProductId, UserId = delivered.UserId, OrderId = delivered.Id, Rating = 5, Title = "Xe vận hành ổn định", Comment = "Nhân viên tư vấn rõ ràng, giao xe đúng hẹn.", ReviewStatus = "Approved", CreatedDate = delivered.CreatedDate.AddDays(2) });
        db.Warranties.Add(new Warranty { Code = "BH-DEMO-0001", OrderId = delivered.Id, OrderLineId = deliveredLine.Id, SkuId = deliveredLine.SkuId, CustomerId = delivered.UserId, ProductSnapshot = deliveredLine.ProductNameSnapshot, SerialNumber = "FRAME-DEMO-AB160-001", StartAt = delivered.CreatedDate, Months = 36, WarrantyStatus = "Active", Note = "Bảo hành xe máy dữ liệu mẫu", CreatedDate = delivered.CreatedDate });

        Order Order(string code, string email, string orderStatus, string paymentStatus, string fulfillmentStatus, int daysAgo, decimal discount, params string[] skuCodes)
        {
            var lines = skuCodes.Select(skuCode =>
            {
                var sku = skuRows[skuCode];
                return new OrderLine { SkuId = sku.Id, ProductNameSnapshot = sku.ProductName, SkuCodeSnapshot = sku.SkuCode, UnitPrice = sku.Price, Qty = 1, LineTotal = sku.Price, CreatedDate = now.AddDays(-daysAgo) };
            }).ToList();
            var subtotal = lines.Sum(x => x.LineTotal);
            return new Order
            {
                Code = code, UserId = users[email].Id, Channel = "Online", OrderType = OrderType.FullPayment,
                OrderStatus = orderStatus, PaymentStatus = paymentStatus, FulfillmentStatus = fulfillmentStatus,
                Subtotal = subtotal, DiscountTotal = discount, ShippingFee = 0, GrandTotal = subtotal - discount,
                RemainingAmount = paymentStatus == PaymentStatus.Paid ? 0 : subtotal - discount,
                ShippingRecipient = users[email].FullName, ShippingPhone = users[email].PhoneNumber ?? "", ShippingAddress = "Địa chỉ giao hàng dữ liệu mẫu",
                ReceivingMethod = "Delivery", Note = "Đơn hàng dữ liệu mẫu", PlacedAt = now.AddDays(-daysAgo), CreatedDate = now.AddDays(-daysAgo), Lines = lines,
            };
        }
    }
}
