using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ProductImageRepository : Repository<ProductImage>, IProductImageRepository
{
    public ProductImageRepository(AppDbContext context) : base(context) { }

    public Task<List<ProductImage>> GetByProductAsync(int productId) =>
        Set.Where(i => i.ProductId == productId)
            .OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder).ThenBy(i => i.Id)
            .ToListAsync();

    public Task<List<ProductImage>> GetPrimariesAsync(int productId, int? skuId) =>
        Set.Where(i => i.ProductId == productId && i.SkuId == skuId && i.IsPrimary).ToListAsync();
}
