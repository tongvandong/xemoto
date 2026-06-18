using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace MoToSale.Services.Catalog;
public partial class CatalogService
{
    private async Task<Dictionary<int, string>> ManufacturerMapAsync() =>
        (await _manufacturers.GetAllAsync()).ToDictionary(m => m.Id, m => m.Name);

    public async Task<PagingResponse<ProductListItem>> SearchProductsAsync(ProductSearchRequest request)
    {
        var page = await _products.SearchAsync(request);
        var mfg = await ManufacturerMapAsync();
        var productIds = page.Items.Select(p => p.Id).ToList();
        var stockByProduct = await _db.Skus.AsNoTracking()
            .Where(sku => productIds.Contains(sku.ProductId))
            .GroupJoin(
                _db.InventoryItems.AsNoTracking(),
                sku => sku.Id,
                item => item.SkuId,
                (sku, inventoryItems) => new
                {
                    sku.ProductId,
                    OnHand = inventoryItems.Sum(item => (int?)item.OnHand) ?? 0,
                })
            .GroupBy(row => row.ProductId)
            .Select(group => new
            {
                ProductId = group.Key,
                StockTotal = group.Sum(row => row.OnHand),
            })
            .ToDictionaryAsync(row => row.ProductId, row => row.StockTotal);
        var reviewStats = await _db.Reviews.AsNoTracking()
            .Where(r => productIds.Contains(r.ProductId) && r.ReviewStatus == "Approved")
            .GroupBy(r => r.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                TotalReviews = g.Count(),
                AverageRating = Math.Round(g.Average(r => (double)r.Rating), 1)
            })
            .ToDictionaryAsync(x => x.ProductId);
        return new PagingResponse<ProductListItem>
        {
            Items = page.Items.Select(p => MapListItem(
                p,
                p.ManufacturerId.HasValue ? mfg.GetValueOrDefault(p.ManufacturerId.Value) : null,
                stockByProduct.GetValueOrDefault(p.Id),
                reviewStats.GetValueOrDefault(p.Id)?.TotalReviews ?? 0,
                reviewStats.GetValueOrDefault(p.Id)?.AverageRating ?? 0)).ToList(),
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
        // Soft-delete: giữ lịch sử đơn/tồn nhưng ẩn khỏi danh sách quản trị mặc định.
        product.Status = (int)EntityStatus.Deleted;
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
}
