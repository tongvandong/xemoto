using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public interface ISkuRepository : IRepository<Sku>
{
    Task<List<Sku>> GetByProductAsync(int productId);
    Task<int> CountByProductAsync(int productId);
    Task<bool> SkuCodeExistsAsync(string skuCode, int? exceptId = null);
}
