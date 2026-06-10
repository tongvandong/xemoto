using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }

    public async Task<PagingResponse<Product>> SearchAsync(ProductSearchRequest r)
    {
        var query = Query.AsNoTracking()
            .Include(p => p.Skus)
            .Include(p => p.Images)
            .Where(p => r.Status.HasValue ? p.Status == r.Status.Value : p.Status == (int)EntityStatus.Active);

        if (!string.IsNullOrWhiteSpace(r.Keyword))
            query = query.Where(p => p.Name.Contains(r.Keyword!) || p.Code.Contains(r.Keyword!));
        if (r.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == r.CategoryId || p.Category.ParentId == r.CategoryId);
        if (r.BrandId.HasValue) query = query.Where(p => p.BrandId == r.BrandId);
        if (r.VehicleModelId.HasValue) query = query.Where(p => p.VehicleModelId == r.VehicleModelId);
        if (r.CompatibleVehicleModelId.HasValue)
        {
            var modelId = r.CompatibleVehicleModelId.Value;
            query = query.Where(p => p.Kind == (int)ProductKind.Part && Context.PartCompatibilities.Any(c =>
                c.PartProductId == p.Id
                && c.Status == (int)EntityStatus.Active
                && (c.AppliesToAll
                    || c.VehicleModelId == modelId
                    || (c.BrandId.HasValue && Context.VehicleModels.Any(m => m.Id == modelId && m.BrandId == c.BrandId.Value)))));
        }
        if (r.Kind.HasValue) query = query.Where(p => p.Kind == r.Kind);
        if (r.Status.HasValue) query = query.Where(p => p.Status == r.Status);
        if (r.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == r.IsFeatured);
        if (r.IsHotDeal.HasValue) query = query.Where(p => p.IsHotDeal == r.IsHotDeal);
        if (r.MinPrice.HasValue) query = query.Where(p => p.Skus.Any(s => (s.SalePrice ?? s.ListPrice) >= r.MinPrice.Value));
        if (r.MaxPrice.HasValue) query = query.Where(p => p.Skus.Any(s => (s.SalePrice ?? s.ListPrice) <= r.MaxPrice.Value));
        if (r.StockStatus is "InStock")
            query = query.Where(p => Context.InventoryItems.Where(i => p.Skus.Select(s => s.Id).Contains(i.SkuId)).Sum(i => (int?)i.OnHand - i.Reserved) > 0);
        if (r.StockStatus is "OutOfStock")
            query = query.Where(p => !Context.InventoryItems.Any(i => p.Skus.Select(s => s.Id).Contains(i.SkuId) && i.OnHand - i.Reserved > 0));
        if (r.StockStatus is "LowStock")
            query = query.Where(p => Context.InventoryItems.Any(i => p.Skus.Select(s => s.Id).Contains(i.SkuId) && i.OnHand - i.Reserved > 0 && i.OnHand - i.Reserved <= i.ReorderPoint));
        if (r.HasPromotion.HasValue)
        {
            var now = DateTime.UtcNow;
            query = r.HasPromotion.Value
                ? query.Where(p => Context.VoucherScopes.Any(s =>
                    Context.Vouchers.Any(v => v.Id == s.VoucherId
                        && v.Status == (int)EntityStatus.Active
                        && (!v.StartAt.HasValue || v.StartAt <= now)
                        && (!v.EndAt.HasValue || v.EndAt >= now)
                        && (!v.UsageLimit.HasValue || v.UsedCount < v.UsageLimit)
                        && ((s.ScopeType == "Product" && s.RefId == p.Id)
                            || (s.ScopeType == "Category" && s.RefId == p.CategoryId)
                            || (s.ScopeType == "Brand" && p.BrandId.HasValue && s.RefId == p.BrandId.Value)))))
                : query.Where(p => !Context.VoucherScopes.Any(s =>
                    Context.Vouchers.Any(v => v.Id == s.VoucherId
                        && v.Status == (int)EntityStatus.Active
                        && (!v.StartAt.HasValue || v.StartAt <= now)
                        && (!v.EndAt.HasValue || v.EndAt >= now)
                        && (!v.UsageLimit.HasValue || v.UsedCount < v.UsageLimit)
                        && ((s.ScopeType == "Product" && s.RefId == p.Id)
                            || (s.ScopeType == "Category" && s.RefId == p.CategoryId)
                            || (s.ScopeType == "Brand" && p.BrandId.HasValue && s.RefId == p.BrandId.Value)))));
        }

        query = (r.SortBy?.ToLowerInvariant()) switch
        {
            "name" => r.SortDescending ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            "price" => r.SortDescending
                ? query.OrderByDescending(p => p.Skus.Min(s => s.SalePrice ?? s.ListPrice))
                : query.OrderBy(p => p.Skus.Min(s => s.SalePrice ?? s.ListPrice)),
            _ => r.SortDescending ? query.OrderByDescending(p => p.Id) : query.OrderBy(p => p.Id),
        };

        var total = await query.CountAsync();
        var items = await query.Skip((r.Page - 1) * r.PageSize).Take(r.PageSize).ToListAsync();

        return new PagingResponse<Product>
        {
            Items = items,
            Page = r.Page,
            PageSize = r.PageSize,
            TotalItems = total,
        };
    }

    public Task<Product?> GetDetailAsync(int id) =>
        Query.AsNoTracking()
            .Include(p => p.Skus)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id);

    public Task<Product?> GetBySlugAsync(string slug) =>
        Query.AsNoTracking()
            .Include(p => p.Skus)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Slug == slug);

    public Task<bool> CodeExistsAsync(string code, int? exceptId = null) =>
        AnyAsync(p => p.Code == code && (exceptId == null || p.Id != exceptId));

    public Task<bool> SlugExistsAsync(string slug, int? exceptId = null) =>
        AnyAsync(p => p.Slug == slug && (exceptId == null || p.Id != exceptId));
}
