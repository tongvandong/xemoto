using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public interface IProductImageRepository : IRepository<ProductImage>
{
    Task<List<ProductImage>> GetByProductAsync(int productId);
    /// <summary>Các ảnh chính hiện tại của cùng phạm vi (product + variant) — để bỏ cờ trước khi đặt ảnh chính mới.</summary>
    Task<List<ProductImage>> GetPrimariesAsync(int productId, int? skuId);
}
