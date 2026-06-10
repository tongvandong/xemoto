using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace MoToSale.Services.Catalog;

public class CatalogService : ICatalogService
{
    private readonly IProductRepository _products;
    private readonly IRepository<Category> _categories;
    private readonly IRepository<Brand> _brands;
    private readonly IRepository<VehicleModel> _models;
    private readonly ISkuRepository _skus;
    private readonly IProductImageRepository _images;
    private readonly IRepository<PartCompatibility> _compat;
    private readonly IRepository<Manufacturer> _manufacturers;
    private readonly MoToSale.Repository.Inventory.IInventoryRepository _inventory;
    private readonly AppDbContext _db;

    public CatalogService(
        IProductRepository products,
        IRepository<Category> categories,
        IRepository<Brand> brands,
        IRepository<VehicleModel> models,
        ISkuRepository skus,
        IProductImageRepository images,
        IRepository<PartCompatibility> compat,
        IRepository<Manufacturer> manufacturers,
        MoToSale.Repository.Inventory.IInventoryRepository inventory,
        AppDbContext db)
    {
        _inventory = inventory;
        _db = db;
        _products = products;
        _categories = categories;
        _brands = brands;
        _models = models;
        _skus = skus;
        _images = images;
        _compat = compat;
        _manufacturers = manufacturers;
    }

    private async Task<Dictionary<int, string>> ManufacturerMapAsync() =>
        (await _manufacturers.GetAllAsync()).ToDictionary(m => m.Id, m => m.Name);

    public async Task<PagingResponse<ProductListItem>> SearchProductsAsync(ProductSearchRequest request)
    {
        var page = await _products.SearchAsync(request);
        var mfg = await ManufacturerMapAsync();
        var skuIds = page.Items.SelectMany(p => p.Skus.Select(s => s.Id)).ToList();
        var onHand = await _inventory.GetOnHandBySkusAsync(skuIds);
        return new PagingResponse<ProductListItem>
        {
            Items = page.Items.Select(p => MapListItem(
                p,
                p.ManufacturerId.HasValue ? mfg.GetValueOrDefault(p.ManufacturerId.Value) : null,
                p.Skus.Sum(s => onHand.GetValueOrDefault(s.Id)))).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        };
    }

    // ===== Hãng sản xuất phụ tùng =====
    public async Task<List<ManufacturerDto>> GetManufacturersAsync()
    {
        var list = await _manufacturers.GetAllAsync();
        return list.Where(m => m.Status != (int)EntityStatus.Inactive && m.Status != (int)EntityStatus.Deleted)
            .OrderBy(m => m.Name).Select(m => new ManufacturerDto(m.Id, m.Name, m.LogoUrl, m.Description, m.Status)).ToList();
    }

    public async Task<int> CreateManufacturerAsync(SaveManufacturerRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên hãng sản xuất là bắt buộc.");
        if (await _manufacturers.AnyAsync(m => m.Name == r.Name.Trim())) throw new CatalogException("Hãng sản xuất đã tồn tại.");
        var m = new Manufacturer
        {
            Name = r.Name.Trim(),
            LogoUrl = string.IsNullOrWhiteSpace(r.LogoUrl) ? null : r.LogoUrl.Trim(),
            Description = r.Description,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };
        _manufacturers.Add(m);
        await _manufacturers.SaveChangesAsync();
        return m.Id;
    }

    public async Task UpdateManufacturerAsync(int id, SaveManufacturerRequest r)
    {
        var m = await _manufacturers.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng sản xuất.");
        m.Name = r.Name.Trim();
        m.LogoUrl = string.IsNullOrWhiteSpace(r.LogoUrl) ? null : r.LogoUrl.Trim();
        m.Description = r.Description;
        m.Status = r.Status;
        m.UpdatedDate = DateTime.UtcNow;
        _manufacturers.Update(m);
        await _manufacturers.SaveChangesAsync();
    }

    public async Task SetManufacturerLogoAsync(int id, string url)
    {
        var m = await _manufacturers.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng sản xuất.");
        m.LogoUrl = url;
        m.UpdatedDate = DateTime.UtcNow;
        _manufacturers.Update(m);
        await _manufacturers.SaveChangesAsync();
    }

    public async Task DeleteManufacturerAsync(int id)
    {
        var m = await _manufacturers.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng sản xuất.");
        // Chặn nếu còn sản phẩm ĐANG BÁN thuộc hãng (tránh ẩn nhầm hãng đang dùng).
        if (await _products.AnyAsync(p => p.ManufacturerId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Hãng sản xuất còn sản phẩm đang bán, không thể xóa.");
        // Xóa mềm: ẩn khỏi danh sách/chọn, giữ nguyên tham chiếu để sản phẩm cũ vẫn hiển thị tên hãng.
        m.Status = (int)EntityStatus.Inactive;
        m.UpdatedDate = DateTime.UtcNow;
        _manufacturers.Update(m);
        await _manufacturers.SaveChangesAsync();
    }

    public async Task<ProductDetail?> GetProductAsync(int id)
    {
        var p = await _products.GetDetailAsync(id);
        if (p is null) return null;
        string? mfgName = p.ManufacturerId.HasValue ? (await _manufacturers.GetByIdAsync(p.ManufacturerId.Value))?.Name : null;
        var detail = MapDetail(p, mfgName);

        // Gắn tồn khả dụng (OnHand - Reserved) cho từng SKU để storefront biết còn hàng hay không.
        var skuIds = detail.Skus.Select(s => s.Id).ToList();
        if (skuIds.Count > 0)
        {
            var avail = await _db.InventoryItems.AsNoTracking()
                .Where(i => skuIds.Contains(i.SkuId))
                .ToDictionaryAsync(i => i.SkuId, i => i.OnHand - i.Reserved);
            detail = detail with { Skus = detail.Skus.Select(s => s with { Available = avail.GetValueOrDefault(s.Id) }).ToList() };
        }
        return detail;
    }

    public async Task DeleteProductAsync(int id)
    {
        var product = await _products.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        // Soft-delete: ngừng kinh doanh (giữ lịch sử đơn/tồn), ẩn khỏi danh sách đang bán.
        product.Status = (int)EntityStatus.Inactive;
        product.UpdatedDate = DateTime.UtcNow;
        _products.Update(product);
        await _products.SaveChangesAsync();
    }

    public async Task<int> CreateProductAsync(CreateProductRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên sản phẩm là bắt buộc.");
        if (r.ListPrice <= 0) throw new CatalogException("Giá niêm yết phải lớn hơn 0.");

        var code = string.IsNullOrWhiteSpace(r.Code) ? $"SP{DateTime.UtcNow:yyyyMMddHHmmss}" : r.Code.Trim();
        if (await _products.CodeExistsAsync(code)) throw new CatalogException("Mã sản phẩm đã tồn tại.");

        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _products.SlugExistsAsync(slug)) throw new CatalogException("Slug đã tồn tại.");

        var now = DateTime.UtcNow;
        var product = new Product
        {
            Code = code,
            Name = r.Name.Trim(),
            Slug = slug,
            CategoryId = r.CategoryId,
            BrandId = r.Kind == (int)ProductKind.Part ? null : r.BrandId,
            VehicleModelId = r.Kind == (int)ProductKind.Part ? null : r.VehicleModelId,
            Kind = r.Kind,
            ShortDescription = r.ShortDescription,
            Description = r.Description,
            ManufacturerId = r.Kind == (int)ProductKind.Part ? r.ManufacturerId : null,
            IsFeatured = r.IsFeatured,
            IsHotDeal = r.IsHotDeal,
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
            Skus =
            {
                // SKU mặc định cho sản phẩm không biến thể.
                new Sku
                {
                    SkuCode = $"{code}-DEFAULT",
                    VariantName = "Mặc định",
                    ListPrice = r.ListPrice,
                    SalePrice = r.SalePrice,
                    CreatedDate = now,
                    Status = (int)EntityStatus.Active,
                },
            },
        };

        _products.Add(product);
        await _products.SaveChangesAsync();
        return product.Id;
    }

    public async Task UpdateProductAsync(int id, UpdateProductRequest r)
    {
        var product = await _products.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        if (r.ListPrice <= 0) throw new CatalogException("Giá niêm yết phải lớn hơn 0.");
        product.Name = r.Name.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) product.Slug = r.Slug!.Trim();
        product.CategoryId = r.CategoryId;
        product.BrandId = product.Kind == (int)ProductKind.Part ? null : r.BrandId;
        product.VehicleModelId = product.Kind == (int)ProductKind.Part ? null : r.VehicleModelId;
        product.ShortDescription = r.ShortDescription;
        product.Description = r.Description;
        product.ManufacturerId = product.Kind == (int)ProductKind.Part ? r.ManufacturerId : null;
        product.IsFeatured = r.IsFeatured;
        product.IsHotDeal = r.IsHotDeal;
        product.Status = r.Status;
        product.UpdatedDate = DateTime.UtcNow;
        _products.Update(product);

        var skus = await _skus.GetByProductAsync(id);
        var baseSku = skus
            .OrderByDescending(s => s.SkuCode.EndsWith("-DEFAULT", StringComparison.OrdinalIgnoreCase))
            .ThenBy(s => s.Id)
            .FirstOrDefault();
        if (baseSku is null)
        {
            baseSku = new Sku
            {
                ProductId = id,
                SkuCode = $"{product.Code}-DEFAULT",
                VariantName = "Mặc định",
                CreatedDate = DateTime.UtcNow,
                Status = (int)EntityStatus.Active,
            };
            _skus.Add(baseSku);
        }
        baseSku.ListPrice = r.ListPrice;
        baseSku.SalePrice = r.SalePrice;
        baseSku.UpdatedDate = DateTime.UtcNow;
        _skus.Update(baseSku);

        await _products.SaveChangesAsync();
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync()
    {
        var list = await _categories.GetAllAsync();
        return list.Where(c => c.Status != (int)EntityStatus.Inactive && c.Status != (int)EntityStatus.Deleted)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.ParentId, c.Name, c.Slug, c.Kind, c.SortOrder, c.Status)).ToList();
    }

    public async Task<List<BrandDto>> GetBrandsAsync()
    {
        var list = await _brands.GetAllAsync();
        return list.Where(b => b.Status != (int)EntityStatus.Inactive && b.Status != (int)EntityStatus.Deleted)
            .OrderBy(b => b.Name).Select(b => new BrandDto(b.Id, b.Name, b.Slug, b.LogoUrl, b.Status)).ToList();
    }

    public async Task<List<VehicleModelDto>> GetVehicleModelsAsync(int? brandId)
    {
        var list = brandId.HasValue
            ? await _models.FindAsync(m => m.BrandId == brandId.Value)
            : await _models.GetAllAsync();
        return list.Where(m => m.Status != (int)EntityStatus.Inactive && m.Status != (int)EntityStatus.Deleted)
            .OrderBy(m => m.Name).Select(m => new VehicleModelDto(m.Id, m.BrandId, m.Name, m.Slug, m.Status)).ToList();
    }

    public async Task<List<SkuLookupDto>> GetSkusAsync()
    {
        var skus = await _skus.GetAllAsync();
        var products = (await _products.GetAllAsync()).ToDictionary(p => p.Id, p => p.Name);
        return skus.OrderBy(s => s.SkuCode)
            .Select(s => new SkuLookupDto(s.Id, s.SkuCode, products.GetValueOrDefault(s.ProductId, ""), s.ListPrice, s.SalePrice))
            .ToList();
    }

    // ===== Biến thể (SKU) =====
    public async Task<List<SkuDto>> GetSkusByProductAsync(int productId)
    {
        var skus = await _skus.GetByProductAsync(productId);
        return skus.Select(s => new SkuDto(s.Id, s.SkuCode, s.VariantName, s.Color, s.Version, s.ListPrice, s.SalePrice, s.Barcode, s.Status)).ToList();
    }

    public async Task<int> CreateSkuAsync(int productId, CreateSkuRequest r)
    {
        if (r.ListPrice <= 0) throw new CatalogException("Giá niêm yết phải lớn hơn 0.");
        var product = await _products.GetByIdAsync(productId) ?? throw new CatalogException("Không tìm thấy sản phẩm.");

        var code = string.IsNullOrWhiteSpace(r.SkuCode) ? $"{product.Code}-{Guid.NewGuid().ToString()[..6].ToUpper()}" : r.SkuCode.Trim();
        if (await _skus.SkuCodeExistsAsync(code)) throw new CatalogException("Mã SKU đã tồn tại.");

        var sku = new Sku
        {
            ProductId = productId,
            SkuCode = code,
            VariantName = r.VariantName?.Trim(),
            Color = r.Color?.Trim(),
            Version = r.Version?.Trim(),
            ListPrice = r.ListPrice,
            SalePrice = r.SalePrice,
            Barcode = r.Barcode?.Trim(),
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };
        _skus.Add(sku);
        await _skus.SaveChangesAsync();
        return sku.Id;
    }

    public async Task UpdateSkuAsync(int productId, int skuId, UpdateSkuRequest r)
    {
        var sku = await _skus.GetByIdAsync(skuId);
        if (sku is null || sku.ProductId != productId) throw new CatalogException("Không tìm thấy biến thể.");
        if (r.ListPrice <= 0) throw new CatalogException("Giá niêm yết phải lớn hơn 0.");

        if (!string.IsNullOrWhiteSpace(r.SkuCode) && r.SkuCode.Trim() != sku.SkuCode)
        {
            if (await _skus.SkuCodeExistsAsync(r.SkuCode.Trim(), skuId)) throw new CatalogException("Mã SKU đã tồn tại.");
            sku.SkuCode = r.SkuCode.Trim();
        }
        sku.VariantName = r.VariantName?.Trim();
        sku.Color = r.Color?.Trim();
        sku.Version = r.Version?.Trim();
        sku.ListPrice = r.ListPrice;
        sku.SalePrice = r.SalePrice;
        sku.Barcode = r.Barcode?.Trim();
        sku.Status = r.Status;
        sku.UpdatedDate = DateTime.UtcNow;
        _skus.Update(sku);
        await _skus.SaveChangesAsync();
    }

    public async Task DeleteSkuAsync(int productId, int skuId)
    {
        var sku = await _skus.GetByIdAsync(skuId);
        if (sku is null || sku.ProductId != productId) throw new CatalogException("Không tìm thấy biến thể.");
        if (await _skus.CountByProductAsync(productId) <= 1) throw new CatalogException("Sản phẩm phải còn ít nhất 1 biến thể.");
        if (await _db.OrderLines.AnyAsync(l => l.SkuId == skuId)
            || await _db.StockMovements.AnyAsync(m => m.SkuId == skuId)
            || await _db.Reservations.AnyAsync(r => r.SkuId == skuId))
            throw new CatalogException("Biến thể đã phát sinh đơn hàng/tồn kho, không thể xóa. Hãy đặt trạng thái Ngừng bán thay vì xóa.");

        // Gỡ ảnh gắn riêng biến thể này (đưa về ảnh chung).
        foreach (var img in (await _images.GetByProductAsync(productId)).Where(i => i.SkuId == skuId))
        {
            img.SkuId = null;
            _images.Update(img);
        }
        _skus.Delete(sku);
        await _skus.SaveChangesAsync();
    }

    // ===== Ảnh =====
    public async Task<List<ProductImageDto>> GetImagesAsync(int productId)
    {
        var imgs = await _images.GetByProductAsync(productId);
        return imgs.Select(i => new ProductImageDto(i.Id, i.SkuId, i.Url, i.Alt, i.IsPrimary, i.SortOrder)).ToList();
    }

    public async Task<int> AddImageAsync(int productId, AddImageRequest r)
    {
        _ = await _products.GetByIdAsync(productId) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        if (string.IsNullOrWhiteSpace(r.Url)) throw new CatalogException("Thiếu URL ảnh.");

        if (r.IsPrimary)
        {
            foreach (var p in await _images.GetPrimariesAsync(productId, r.SkuId)) { p.IsPrimary = false; _images.Update(p); }
        }

        var img = new ProductImage
        {
            ProductId = productId,
            SkuId = r.SkuId,
            Url = r.Url.Trim(),
            Alt = r.Alt?.Trim(),
            IsPrimary = r.IsPrimary,
            SortOrder = r.SortOrder,
            CreatedDate = DateTime.UtcNow,
        };
        _images.Add(img);
        await _images.SaveChangesAsync();
        return img.Id;
    }

    public async Task SetPrimaryImageAsync(int productId, int imageId)
    {
        var img = await _images.GetByIdAsync(imageId);
        if (img is null || img.ProductId != productId) throw new CatalogException("Không tìm thấy ảnh.");
        foreach (var p in await _images.GetPrimariesAsync(productId, img.SkuId)) { p.IsPrimary = false; _images.Update(p); }
        img.IsPrimary = true;
        _images.Update(img);
        await _images.SaveChangesAsync();
    }

    public async Task DeleteImageAsync(int productId, int imageId)
    {
        var img = await _images.GetByIdAsync(imageId);
        if (img is null || img.ProductId != productId) throw new CatalogException("Không tìm thấy ảnh.");
        _images.Delete(img);
        await _images.SaveChangesAsync();
    }

    // ===== Hãng xe =====
    public async Task<int> CreateBrandAsync(CreateBrandRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên hãng là bắt buộc.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _brands.AnyAsync(b => b.Slug == slug)) throw new CatalogException("Slug hãng đã tồn tại.");
        var brand = new Brand { Name = r.Name.Trim(), Slug = slug, LogoUrl = r.LogoUrl, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _brands.Add(brand);
        await _brands.SaveChangesAsync();
        return brand.Id;
    }

    public async Task UpdateBrandAsync(int id, UpdateBrandRequest r)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        brand.Name = r.Name.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) brand.Slug = r.Slug!.Trim();
        if (r.LogoUrl != null) brand.LogoUrl = r.LogoUrl;
        brand.Status = r.Status;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    public async Task SetBrandLogoAsync(int id, string url)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        brand.LogoUrl = url;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    public async Task DeleteBrandAsync(int id)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        if (await _models.AnyAsync(m => m.BrandId == id && m.Status == (int)EntityStatus.Active))
            throw new CatalogException("Hãng còn dòng xe đang dùng, không thể xóa.");
        if (await _products.AnyAsync(p => p.BrandId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Hãng còn sản phẩm đang bán, không thể xóa.");
        // Xóa mềm: ẩn khỏi danh sách/chọn, giữ tham chiếu cho dữ liệu cũ.
        brand.Status = (int)EntityStatus.Inactive;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    // ===== Dòng xe =====
    public async Task<int> CreateModelAsync(CreateModelRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên dòng xe là bắt buộc.");
        if (!await _brands.AnyAsync(b => b.Id == r.BrandId)) throw new CatalogException("Hãng không hợp lệ.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _models.AnyAsync(m => m.Slug == slug)) throw new CatalogException("Slug dòng xe đã tồn tại.");
        var model = new VehicleModel { BrandId = r.BrandId, Name = r.Name.Trim(), Slug = slug, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _models.Add(model);
        await _models.SaveChangesAsync();
        return model.Id;
    }

    public async Task UpdateModelAsync(int id, UpdateModelRequest r)
    {
        var model = await _models.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy dòng xe.");
        model.BrandId = r.BrandId;
        model.Name = r.Name.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) model.Slug = r.Slug!.Trim();
        model.Status = r.Status;
        model.UpdatedDate = DateTime.UtcNow;
        _models.Update(model);
        await _models.SaveChangesAsync();
    }

    public async Task DeleteModelAsync(int id)
    {
        var model = await _models.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy dòng xe.");
        if (await _products.AnyAsync(p => p.VehicleModelId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Dòng xe còn sản phẩm đang bán, không thể xóa.");
        model.Status = (int)EntityStatus.Inactive;
        model.UpdatedDate = DateTime.UtcNow;
        _models.Update(model);
        await _models.SaveChangesAsync();
    }

    // ===== Danh mục =====
    private static bool IsSystemRootCategory(Category category) =>
        category.ParentId is null && (category.Slug == "xe-may" || category.Slug == "phu-tung");

    private static int KindFromSystemRootSlug(string slug) =>
        slug == "xe-may" ? (int)ProductKind.Motorcycle : (int)ProductKind.Part;

    private async Task<Category> GetValidCategoryParentAsync(int? parentId)
    {
        if (!parentId.HasValue)
            throw new CatalogException("Danh mục mới phải nằm dưới Xe máy hoặc Phụ tùng.");

        var parent = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c =>
            c.Id == parentId.Value &&
            c.Status != (int)EntityStatus.Inactive &&
            c.Status != (int)EntityStatus.Deleted);

        if (parent is null)
            throw new CatalogException("Danh mục cha không hợp lệ.");

        if (!IsSystemRootCategory(parent))
            throw new CatalogException("Danh mục cha chỉ được là Xe máy hoặc Phụ tùng.");

        return parent;
    }

    public async Task<int> CreateCategoryAsync(CreateCategoryRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên danh mục là bắt buộc.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _categories.AnyAsync(c => c.Slug == slug)) throw new CatalogException("Slug danh mục đã tồn tại.");

        int kind;
        if (r.ParentId is null)
        {
            if (slug != "xe-may" && slug != "phu-tung")
                throw new CatalogException("Chỉ được tạo danh mục con dưới Xe máy hoặc Phụ tùng.");

            kind = KindFromSystemRootSlug(slug);
        }
        else
        {
            var parent = await GetValidCategoryParentAsync(r.ParentId);
            kind = parent.Kind;
        }

        var cat = new Category { ParentId = r.ParentId, Name = r.Name.Trim(), Slug = slug, Kind = kind, SortOrder = r.SortOrder, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _categories.Add(cat);
        await _categories.SaveChangesAsync();
        return cat.Id;
    }

    public async Task UpdateCategoryAsync(int id, UpdateCategoryRequest r)
    {
        var cat = await _categories.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy danh mục.");
        if (r.ParentId == id) throw new CatalogException("Danh mục không thể là cha của chính nó.");

        var currentIsSystemRoot = IsSystemRootCategory(cat);
        if (currentIsSystemRoot)
        {
            if (r.ParentId is not null)
                throw new CatalogException("Danh mục gốc hệ thống không thể chuyển thành danh mục con.");
            cat.ParentId = null;
            cat.Kind = KindFromSystemRootSlug(cat.Slug);
        }
        else
        {
            var parent = await GetValidCategoryParentAsync(r.ParentId);
            cat.ParentId = parent.Id;
            cat.Kind = parent.Kind;
        }

        cat.Name = r.Name.Trim();
        if (currentIsSystemRoot && !string.IsNullOrWhiteSpace(r.Slug) && r.Slug.Trim() != cat.Slug)
            throw new CatalogException("Không thể đổi slug danh mục gốc hệ thống.");
        if (!string.IsNullOrWhiteSpace(r.Slug)) cat.Slug = r.Slug!.Trim();
        cat.SortOrder = r.SortOrder;
        cat.Status = currentIsSystemRoot ? (int)EntityStatus.Active : r.Status;
        cat.UpdatedDate = DateTime.UtcNow;
        _categories.Update(cat);
        await _categories.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(int id)
    {
        var cat = await _categories.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy danh mục.");
        if (IsSystemRootCategory(cat))
            throw new CatalogException("Không thể xóa danh mục gốc Xe máy hoặc Phụ tùng.");
        if (await _categories.AnyAsync(c => c.ParentId == id && c.Status == (int)EntityStatus.Active))
            throw new CatalogException("Danh mục còn danh mục con đang dùng, không thể xóa.");
        if (await _products.AnyAsync(p => p.CategoryId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Danh mục còn sản phẩm đang bán, không thể xóa.");
        cat.Status = (int)EntityStatus.Inactive;
        cat.UpdatedDate = DateTime.UtcNow;
        _categories.Update(cat);
        await _categories.SaveChangesAsync();
    }

    // ===== Tương thích phụ tùng =====
    public async Task<List<CompatibilityDto>> GetCompatibilitiesAsync(int productId)
    {
        var rows = await _compat.FindAsync(c => c.PartProductId == productId);
        var brands = (await _brands.GetAllAsync()).ToDictionary(b => b.Id, b => b.Name);
        var models = (await _models.GetAllAsync()).ToDictionary(m => m.Id, m => m.Name);
        return rows.Select(c => new CompatibilityDto(
            c.Id, c.PartProductId, c.BrandId, c.BrandId.HasValue ? brands.GetValueOrDefault(c.BrandId.Value) : null,
            c.VehicleModelId, c.VehicleModelId.HasValue ? models.GetValueOrDefault(c.VehicleModelId.Value) : null,
            c.YearFrom, c.YearTo, c.AppliesToAll, c.Note, c.Status)).ToList();
    }

    public async Task<int> CreateCompatibilityAsync(int productId, SaveCompatibilityRequest r)
    {
        _ = await _products.GetByIdAsync(productId) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        if (!r.AppliesToAll && !r.BrandId.HasValue && !r.VehicleModelId.HasValue)
            throw new CatalogException("Chọn hãng/dòng xe hoặc đánh dấu áp dụng tất cả.");
        var c = new PartCompatibility
        {
            PartProductId = productId, BrandId = r.BrandId, VehicleModelId = r.VehicleModelId,
            YearFrom = r.YearFrom, YearTo = r.YearTo, AppliesToAll = r.AppliesToAll, Note = r.Note,
            CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active,
        };
        _compat.Add(c);
        await _compat.SaveChangesAsync();
        return c.Id;
    }

    public async Task UpdateCompatibilityAsync(int productId, int id, SaveCompatibilityRequest r)
    {
        var c = await _compat.GetByIdAsync(id);
        if (c is null || c.PartProductId != productId) throw new CatalogException("Không tìm thấy cấu hình tương thích.");
        c.BrandId = r.BrandId; c.VehicleModelId = r.VehicleModelId; c.YearFrom = r.YearFrom; c.YearTo = r.YearTo;
        c.AppliesToAll = r.AppliesToAll; c.Note = r.Note; c.UpdatedDate = DateTime.UtcNow;
        _compat.Update(c);
        await _compat.SaveChangesAsync();
    }

    public async Task DeleteCompatibilityAsync(int productId, int id)
    {
        var c = await _compat.GetByIdAsync(id);
        if (c is null || c.PartProductId != productId) throw new CatalogException("Không tìm thấy cấu hình tương thích.");
        _compat.Delete(c);
        await _compat.SaveChangesAsync();
    }

    public async Task<List<ProductPromotionDto>> GetPromotionsAsync(int productId)
    {
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        var now = DateTime.UtcNow;

        var scoped = await _db.VoucherScopes.AsNoTracking()
            .Include(s => s.Voucher)
            .Where(s => s.Voucher.Status == (int)EntityStatus.Active
                && (!s.Voucher.StartAt.HasValue || s.Voucher.StartAt <= now)
                && (!s.Voucher.EndAt.HasValue || s.Voucher.EndAt >= now)
                && (!s.Voucher.UsageLimit.HasValue || s.Voucher.UsedCount < s.Voucher.UsageLimit)
                && ((s.ScopeType == "Product" && s.RefId == product.Id)
                    || (s.ScopeType == "Category" && s.RefId == product.CategoryId)
                    || (s.ScopeType == "Brand" && product.BrandId.HasValue && s.RefId == product.BrandId.Value)))
            .Select(s => new ProductPromotionDto(
                s.Voucher.Id, s.Voucher.Code, s.Voucher.DiscountType, s.Voucher.DiscountValue,
                s.Voucher.MaxDiscount, s.Voucher.MinOrderValue, s.Voucher.StartAt, s.Voucher.EndAt,
                s.ScopeType, s.RefId, s.Voucher.Description ?? "", s.Voucher.UsedCount, s.Voucher.UsageLimit))
            .ToListAsync();

        var scopedVoucherIds = await _db.VoucherScopes.AsNoTracking().Select(s => s.VoucherId).Distinct().ToListAsync();
        var global = await _db.Vouchers.AsNoTracking()
            .Where(v => !scopedVoucherIds.Contains(v.Id)
                && v.Status == (int)EntityStatus.Active
                && (!v.StartAt.HasValue || v.StartAt <= now)
                && (!v.EndAt.HasValue || v.EndAt >= now)
                && (!v.UsageLimit.HasValue || v.UsedCount < v.UsageLimit))
            .Select(v => new ProductPromotionDto(
                v.Id, v.Code, v.DiscountType, v.DiscountValue, v.MaxDiscount, v.MinOrderValue,
                v.StartAt, v.EndAt, "All", 0, v.Description ?? "", v.UsedCount, v.UsageLimit))
            .ToListAsync();

        return scoped.Concat(global).OrderBy(x => x.Code).ToList();
    }

    public async Task<List<ProductRelatedItemDto>> GetRelatedItemsAsync(int productId)
    {
        _ = await _products.GetByIdAsync(productId) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        var rows = await _db.ProductRelatedItems.AsNoTracking()
            .Include(x => x.RelatedProduct)
            .ThenInclude(p => p.Skus)
            .Where(x => x.ProductId == productId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.RelatedProduct.Name)
            .ToListAsync();

        var skuIds = rows.SelectMany(x => x.RelatedProduct.Skus.Select(s => s.Id)).Distinct().ToList();
        var stock = await _inventory.GetOnHandBySkusAsync(skuIds);
        return rows.Select(x =>
        {
            var sku = x.RelatedProduct.Skus.OrderBy(s => s.SalePrice ?? s.ListPrice).FirstOrDefault();
            var stockTotal = x.RelatedProduct.Skus.Sum(s => stock.GetValueOrDefault(s.Id));
            return new ProductRelatedItemDto(
                x.Id, x.ProductId, x.RelatedProductId, x.RelatedProduct.Code, x.RelatedProduct.Name,
                x.RelationType, x.Note, x.SortOrder, stockTotal, sku?.ListPrice ?? 0, sku?.SalePrice);
        }).ToList();
    }

    public async Task<int> CreateRelatedItemAsync(int productId, SaveProductRelatedItemRequest request)
    {
        if (productId == request.RelatedProductId) throw new CatalogException("Sản phẩm không thể bán kèm với chính nó.");
        _ = await _products.GetByIdAsync(productId) ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        _ = await _products.GetByIdAsync(request.RelatedProductId) ?? throw new CatalogException("Không tìm thấy sản phẩm bán kèm.");
        var relationType = NormalizeRelationType(request.RelationType);
        if (await _db.ProductRelatedItems.AnyAsync(x => x.ProductId == productId && x.RelatedProductId == request.RelatedProductId && x.RelationType == relationType))
            throw new CatalogException("Sản phẩm bán kèm này đã tồn tại.");

        var entity = new ProductRelatedItem
        {
            ProductId = productId,
            RelatedProductId = request.RelatedProductId,
            RelationType = relationType,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            SortOrder = request.SortOrder,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };
        _db.ProductRelatedItems.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task UpdateRelatedItemAsync(int productId, int id, SaveProductRelatedItemRequest request)
    {
        if (productId == request.RelatedProductId) throw new CatalogException("Sản phẩm không thể bán kèm với chính nó.");
        var entity = await _db.ProductRelatedItems.FirstOrDefaultAsync(x => x.Id == id && x.ProductId == productId)
            ?? throw new CatalogException("Không tìm thấy cấu hình bán kèm.");
        _ = await _products.GetByIdAsync(request.RelatedProductId) ?? throw new CatalogException("Không tìm thấy sản phẩm bán kèm.");
        var relationType = NormalizeRelationType(request.RelationType);
        if (await _db.ProductRelatedItems.AnyAsync(x => x.Id != id && x.ProductId == productId && x.RelatedProductId == request.RelatedProductId && x.RelationType == relationType))
            throw new CatalogException("Sản phẩm bán kèm này đã tồn tại.");

        entity.RelatedProductId = request.RelatedProductId;
        entity.RelationType = relationType;
        entity.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        entity.SortOrder = request.SortOrder;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteRelatedItemAsync(int productId, int id)
    {
        var entity = await _db.ProductRelatedItems.FirstOrDefaultAsync(x => x.Id == id && x.ProductId == productId)
            ?? throw new CatalogException("Không tìm thấy cấu hình bán kèm.");
        _db.ProductRelatedItems.Remove(entity);
        await _db.SaveChangesAsync();
    }

    public async Task<List<ProductInventoryAgingDto>> GetInventoryAgingAsync(int productId)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(p => p.Skus)
            .FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        var skuIds = product.Skus.Select(s => s.Id).ToList();
        var inventory = await _db.InventoryItems.AsNoTracking().Where(i => skuIds.Contains(i.SkuId)).ToListAsync();
        var movements = await _db.StockMovements.AsNoTracking().Where(m => skuIds.Contains(m.SkuId)).ToListAsync();
        var soldDates = await _db.OrderLines.AsNoTracking()
            .Include(l => l.Order)
            .Where(l => skuIds.Contains(l.SkuId) && l.Order.OrderStatus != OrderStatus.Cancelled)
            .GroupBy(l => l.SkuId)
            .Select(g => new { SkuId = g.Key, LastSoldAt = g.Max(x => x.Order.PlacedAt ?? x.Order.CreatedDate) })
            .ToDictionaryAsync(x => x.SkuId, x => (DateTime?)x.LastSoldAt);

        var today = DateTime.UtcNow.Date;
        return product.Skus.OrderBy(s => s.SkuCode).Select(s =>
        {
            var rows = inventory.Where(i => i.SkuId == s.Id).ToList();
            var onHand = rows.Sum(i => i.OnHand);
            var reserved = rows.Sum(i => i.Reserved);
            var firstStock = movements.Where(m => m.SkuId == s.Id && m.QtyDelta > 0).OrderBy(m => m.OccurredAt).Select(m => (DateTime?)m.OccurredAt).FirstOrDefault();
            var lastStockIn = movements.Where(m => m.SkuId == s.Id && m.QtyDelta > 0).OrderByDescending(m => m.OccurredAt).Select(m => (DateTime?)m.OccurredAt).FirstOrDefault();
            soldDates.TryGetValue(s.Id, out var lastSoldAt);
            var baseDate = firstStock ?? s.CreatedDate;
            var daysInStock = onHand > 0 ? Math.Max(0, (today - baseDate.Date).Days) : 0;
            var daysSinceSale = lastSoldAt.HasValue ? Math.Max(0, (today - lastSoldAt.Value.Date).Days) : daysInStock;
            var status = onHand <= 0 ? "Hết hàng" : daysSinceSale >= 180 ? "Tồn chậm" : daysSinceSale >= 90 ? "Cần theo dõi" : "Bình thường";
            return new ProductInventoryAgingDto(
                s.Id, s.SkuCode, product.Name, s.VariantName, onHand, reserved, onHand - reserved,
                firstStock, lastStockIn, lastSoldAt, daysInStock, daysSinceSale, status);
        }).ToList();
    }

    public async Task<List<BarcodeLabelDto>> GetBarcodeLabelsAsync(int productId)
    {
        var product = await _db.Products.AsNoTracking()
            .Include(p => p.Skus)
            .FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new CatalogException("Không tìm thấy sản phẩm.");
        return product.Skus.OrderBy(s => s.SkuCode).Select(s => new BarcodeLabelDto(
            product.Id, s.Id, product.Code, product.Name, s.SkuCode, s.VariantName,
            string.IsNullOrWhiteSpace(s.Barcode) ? s.SkuCode : s.Barcode!,
            s.SalePrice ?? s.ListPrice)).ToList();
    }

    private static ProductListItem MapListItem(Product p, string? manufacturerName, int stockTotal)
    {
        var sku = p.Skus.OrderBy(s => s.SalePrice ?? s.ListPrice).FirstOrDefault();
        var image = p.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder).FirstOrDefault();
        return new ProductListItem(p.Id, p.Code, p.Name, p.Slug, p.CategoryId, p.BrandId, p.VehicleModelId, p.Kind,
            p.IsFeatured, p.IsHotDeal, sku?.ListPrice ?? 0, sku?.SalePrice, image?.Url, p.ManufacturerId, manufacturerName, stockTotal, p.Status);
    }

    private static ProductDetail MapDetail(Product p, string? manufacturerName) => new(
        p.Id, p.Code, p.Name, p.Slug, p.CategoryId, p.BrandId, p.VehicleModelId, p.Kind,
        p.ShortDescription, p.Description, p.IsFeatured, p.IsHotDeal, p.ManufacturerId, manufacturerName, p.Status,
        p.Skus.Select(s => new SkuDto(s.Id, s.SkuCode, s.VariantName, s.Color, s.Version, s.ListPrice, s.SalePrice, s.Barcode, s.Status)),
        p.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder)
            .Select(i => new ProductImageDto(i.Id, i.SkuId, i.Url, i.Alt, i.IsPrimary, i.SortOrder)));

    private static string Slugify(string value)
    {
        var s = value.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var chars = s.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark);
        s = new string(chars.ToArray()).Normalize(System.Text.NormalizationForm.FormC).Replace('đ', 'd');
        s = System.Text.RegularExpressions.Regex.Replace(s, "[^a-z0-9]+", "-").Trim('-');
        return s;
    }

    private static string NormalizeRelationType(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "Accessory" : value.Trim();
        return normalized is "Accessory" or "Bundle" or "Alternative" ? normalized : "Accessory";
    }
}
