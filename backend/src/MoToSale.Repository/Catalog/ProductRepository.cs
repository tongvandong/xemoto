using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagingResponse<Product>> SearchAsync(ProductSearchRequest request)
    {
        IQueryable<Product> query = Query
            .AsNoTracking()
            .Include(product => product.Skus)
            .Include(product => product.Images);

        query = ApplyDefaultStatusFilter(query, request);
        query = ApplyBasicFilters(query, request);
        query = ApplyVehicleCompatibilityFilter(query, request);
        query = ApplyPriceFilters(query, request);
        query = ApplyStockStatusFilter(query, request);
        query = ApplyPromotionFilter(query, request);
        query = ApplySorting(query, request);

        int totalItems = await query.CountAsync();

        List<Product> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<Product>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<Product?> GetDetailAsync(int id)
    {
        Product? product = await Query
            .AsNoTracking()
            .Include(item => item.Skus)
            .Include(item => item.Images)
            .FirstOrDefaultAsync(item => item.Id == id);

        return product;
    }

    public async Task<Product?> GetBySlugAsync(string slug)
    {
        Product? product = await Query
            .AsNoTracking()
            .Include(item => item.Skus)
            .Include(item => item.Images)
            .FirstOrDefaultAsync(item => item.Slug == slug);

        return product;
    }

    public async Task<bool> CodeExistsAsync(string code, int? exceptId = null)
    {
        bool exists = await Query.AnyAsync(product =>
            product.Code == code
            && (!exceptId.HasValue || product.Id != exceptId.Value));

        return exists;
    }

    public async Task<bool> SlugExistsAsync(string slug, int? exceptId = null)
    {
        bool exists = await Query.AnyAsync(product =>
            product.Slug == slug
            && (!exceptId.HasValue || product.Id != exceptId.Value));

        return exists;
    }

    private static IQueryable<Product> ApplyDefaultStatusFilter(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (request.Status.HasValue)
        {
            return query.Where(product => product.Status == request.Status.Value);
        }

        return query.Where(product => product.Status == (int)EntityStatus.Active);
    }

    private static IQueryable<Product> ApplyBasicFilters(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword;
            query = query.Where(product =>
                product.Name.Contains(keyword)
                || product.Code.Contains(keyword));
        }

        if (request.CategoryId.HasValue)
        {
            int categoryId = request.CategoryId.Value;
            query = query.Where(product =>
                product.CategoryId == categoryId
                || product.Category.ParentId == categoryId);
        }

        if (request.BrandId.HasValue)
        {
            int brandId = request.BrandId.Value;
            query = query.Where(product => product.BrandId == brandId);
        }

        if (request.VehicleModelId.HasValue)
        {
            int vehicleModelId = request.VehicleModelId.Value;
            query = query.Where(product => product.VehicleModelId == vehicleModelId);
        }

        if (request.Kind.HasValue)
        {
            int kind = request.Kind.Value;
            query = query.Where(product => product.Kind == kind);
        }

        if (request.IsFeatured.HasValue)
        {
            bool isFeatured = request.IsFeatured.Value;
            query = query.Where(product => product.IsFeatured == isFeatured);
        }

        if (request.IsHotDeal.HasValue)
        {
            bool isHotDeal = request.IsHotDeal.Value;
            query = query.Where(product => product.IsHotDeal == isHotDeal);
        }

        return query;
    }

    private IQueryable<Product> ApplyVehicleCompatibilityFilter(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (!request.CompatibleVehicleModelId.HasValue)
        {
            return query;
        }

        int modelId = request.CompatibleVehicleModelId.Value;

        query = query.Where(product =>
            product.Kind == (int)ProductKind.Part
            && Context.PartCompatibilities.Any(compatibility =>
                compatibility.PartProductId == product.Id
                && compatibility.Status == (int)EntityStatus.Active
                && (compatibility.AppliesToAll
                    || compatibility.VehicleModelId == modelId
                    || (compatibility.BrandId.HasValue
                        && Context.VehicleModels.Any(model =>
                            model.Id == modelId
                            && model.BrandId == compatibility.BrandId.Value)))));

        return query;
    }

    private static IQueryable<Product> ApplyPriceFilters(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (request.MinPrice.HasValue)
        {
            decimal minPrice = request.MinPrice.Value;
            query = query.Where(product =>
                product.Skus.Any(sku => (sku.SalePrice ?? sku.ListPrice) >= minPrice));
        }

        if (request.MaxPrice.HasValue)
        {
            decimal maxPrice = request.MaxPrice.Value;
            query = query.Where(product =>
                product.Skus.Any(sku => (sku.SalePrice ?? sku.ListPrice) <= maxPrice));
        }

        return query;
    }

    private IQueryable<Product> ApplyStockStatusFilter(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (request.StockStatus == "InStock")
        {
            query = query.Where(product =>
                Context.InventoryItems
                    .Where(item => product.Skus.Select(sku => sku.Id).Contains(item.SkuId))
                    .Sum(item => (int?)item.OnHand - item.Reserved) > 0);
        }

        if (request.StockStatus == "OutOfStock")
        {
            query = query.Where(product =>
                !Context.InventoryItems.Any(item =>
                    product.Skus.Select(sku => sku.Id).Contains(item.SkuId)
                    && item.OnHand - item.Reserved > 0));
        }

        if (request.StockStatus == "LowStock")
        {
            query = query.Where(product =>
                Context.InventoryItems.Any(item =>
                    product.Skus.Select(sku => sku.Id).Contains(item.SkuId)
                    && item.OnHand - item.Reserved > 0
                    && item.OnHand - item.Reserved <= item.ReorderPoint));
        }

        return query;
    }

    private IQueryable<Product> ApplyPromotionFilter(IQueryable<Product> query, ProductSearchRequest request)
    {
        if (!request.HasPromotion.HasValue)
        {
            return query;
        }

        DateTime now = DateTime.UtcNow;

        if (request.HasPromotion.Value)
        {
            query = query.Where(HasActivePromotionExpression(now));
        }
        else
        {
            query = query.Where(product =>
                !Context.VoucherScopes.Any(scope =>
                    Context.Vouchers.Any(voucher =>
                        voucher.Id == scope.VoucherId
                        && voucher.Status == (int)EntityStatus.Active
                        && (!voucher.StartAt.HasValue || voucher.StartAt <= now)
                        && (!voucher.EndAt.HasValue || voucher.EndAt >= now)
                        && (!voucher.UsageLimit.HasValue || voucher.UsedCount < voucher.UsageLimit)
                        && ((scope.ScopeType == "Product" && scope.RefId == product.Id)
                            || (scope.ScopeType == "Category" && scope.RefId == product.CategoryId)
                            || (scope.ScopeType == "Brand" && product.BrandId.HasValue && scope.RefId == product.BrandId.Value)))));
        }

        return query;
    }

    private Expression<Func<Product, bool>> HasActivePromotionExpression(DateTime now)
    {
        return product => Context.VoucherScopes.Any(scope =>
            Context.Vouchers.Any(voucher =>
                voucher.Id == scope.VoucherId
                && voucher.Status == (int)EntityStatus.Active
                && (!voucher.StartAt.HasValue || voucher.StartAt <= now)
                && (!voucher.EndAt.HasValue || voucher.EndAt >= now)
                && (!voucher.UsageLimit.HasValue || voucher.UsedCount < voucher.UsageLimit)
                && ((scope.ScopeType == "Product" && scope.RefId == product.Id)
                    || (scope.ScopeType == "Category" && scope.RefId == product.CategoryId)
                    || (scope.ScopeType == "Brand" && product.BrandId.HasValue && scope.RefId == product.BrandId.Value))));
    }

    private static IQueryable<Product> ApplySorting(IQueryable<Product> query, ProductSearchRequest request)
    {
        string sortBy = (request.SortBy ?? string.Empty).ToLowerInvariant();
        bool sortDescending = request.SortDescending;

        if (sortBy == "name")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(product => product.Name);
            }

            return query.OrderBy(product => product.Name);
        }

        if (sortBy == "price")
        {
            if (sortDescending)
            {
                return query.OrderByDescending(product => product.Skus.Min(sku => sku.SalePrice ?? sku.ListPrice));
            }

            return query.OrderBy(product => product.Skus.Min(sku => sku.SalePrice ?? sku.ListPrice));
        }

        if (sortDescending)
        {
            return query.OrderByDescending(product => product.Id);
        }

        return query.OrderBy(product => product.Id);
    }
}
