using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ProductImageRepository : Repository<ProductImage>, IProductImageRepository
{
    public ProductImageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<ProductImage>> GetByProductAsync(int productId)
    {
        List<ProductImage> images = await Set
            .Where(image => image.ProductId == productId)
            .OrderByDescending(image => image.IsPrimary)
            .ThenBy(image => image.SortOrder)
            .ThenBy(image => image.Id)
            .ToListAsync();

        return images;
    }

    public async Task<List<ProductImage>> GetPrimariesAsync(int productId, int? skuId)
    {
        List<ProductImage> images = await Set
            .Where(image =>
                image.ProductId == productId
                && image.SkuId == skuId
                && image.IsPrimary)
            .ToListAsync();

        return images;
    }
}
