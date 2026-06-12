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

    private static ProductListItem MapListItem(Product p, string? manufacturerName, int stockTotal, int totalReviews = 0, double averageRating = 0)
    {
        var sku = p.Skus.OrderBy(s => s.SalePrice ?? s.ListPrice).FirstOrDefault();
        var image = p.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder).FirstOrDefault();
        return new ProductListItem(p.Id, p.Code, p.Name, p.Slug, p.CategoryId, p.BrandId, p.VehicleModelId, p.Kind,
            p.IsFeatured, p.IsHotDeal, sku?.ListPrice ?? 0, sku?.SalePrice, image?.Url, p.ManufacturerId, manufacturerName, stockTotal, p.Status, totalReviews, averageRating);
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
