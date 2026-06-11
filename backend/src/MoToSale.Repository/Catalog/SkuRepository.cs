using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class SkuRepository : Repository<Sku>, ISkuRepository
{
    public SkuRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<Sku>> GetByProductAsync(int productId)
    {
        List<Sku> skus = await Set
            .Where(sku => sku.ProductId == productId)
            .OrderBy(sku => sku.Id)
            .ToListAsync();

        return skus;
    }

    public async Task<int> CountByProductAsync(int productId)
    {
        int count = await Set.CountAsync(sku => sku.ProductId == productId);
        return count;
    }

    public async Task<bool> SkuCodeExistsAsync(string skuCode, int? exceptId = null)
    {
        bool exists = await Set.AnyAsync(sku =>
            sku.SkuCode == skuCode
            && (!exceptId.HasValue || sku.Id != exceptId.Value));

        return exists;
    }
}
