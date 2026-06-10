using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class SkuRepository : Repository<Sku>, ISkuRepository
{
    public SkuRepository(AppDbContext context) : base(context) { }

    public Task<List<Sku>> GetByProductAsync(int productId) =>
        Set.Where(s => s.ProductId == productId).OrderBy(s => s.Id).ToListAsync();

    public Task<int> CountByProductAsync(int productId) => Set.CountAsync(s => s.ProductId == productId);

    public Task<bool> SkuCodeExistsAsync(string skuCode, int? exceptId = null) =>
        Set.AnyAsync(s => s.SkuCode == skuCode && (exceptId == null || s.Id != exceptId));
}
