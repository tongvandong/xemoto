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

    public async Task<List<CategoryDto>> GetActiveCategoriesAsync()
    {
        List<CategoryDto> categories = await GetCategoriesAsync();

        return categories
            .Where(category => category.Status == (int)EntityStatus.Active)
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .ToList();
    }

    public async Task<List<BrandDto>> GetActiveBrandsAsync()
    {
        List<BrandDto> brands = await GetBrandsAsync();

        return brands
            .Where(brand => brand.Status == (int)EntityStatus.Active)
            .OrderBy(brand => brand.Name)
            .ToList();
    }

    public async Task<List<VehicleModelDto>> GetActiveVehicleModelsAsync()
    {
        List<BrandDto> brands = await GetActiveBrandsAsync();
        Dictionary<int, string> brandMap = brands.ToDictionary(brand => brand.Id, brand => brand.Name);
        List<VehicleModelDto> vehicleModels = await GetVehicleModelsAsync(null);

        return vehicleModels
            .Where(model => model.Status == (int)EntityStatus.Active)
            .OrderBy(model => brandMap.GetValueOrDefault(model.BrandId))
            .ThenBy(model => model.Name)
            .ToList();
    }

    public async Task<List<SkuLookupDto>> GetSkusAsync()
    {
        var skus = await _skus.GetAllAsync();
        // Chỉ lấy SKU của sản phẩm CHƯA bị xóa mềm (status != Deleted) — tránh hiện SKU của sản phẩm
        // đã xóa trong các ô chọn (đơn mua hàng, POS...). Sản phẩm Ngừng bán (Inactive) vẫn cho chọn.
        var products = (await _products.GetAllAsync())
            .Where(p => p.Status != (int)EntityStatus.Deleted)
            .ToDictionary(p => p.Id, p => p.Name);
        return skus
            .Where(s => products.ContainsKey(s.ProductId))
            .OrderBy(s => s.SkuCode)
            .Select(s => new SkuLookupDto(s.Id, s.SkuCode, products[s.ProductId], s.ListPrice, s.SalePrice))
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

}
