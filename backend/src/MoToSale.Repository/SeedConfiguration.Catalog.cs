using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Entities.Catalog;

namespace MoToSale.Repository;

// Seed danh mục (catalog): hãng xe, dòng xe, danh mục, nhà sản xuất, sản phẩm, SKU, tương thích phụ tùng.
public static partial class SeedConfiguration
{
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
}
