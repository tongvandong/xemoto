using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public interface IProductRepository : IRepository<Product>
{
    Task<ProductPagingResponse<Product>> SearchAsync(ProductSearchRequest request);
    Task<Product?> GetDetailAsync(int id);
    Task<Product?> GetBySlugAsync(string slug);
    Task<bool> CodeExistsAsync(string code, int? exceptId = null);
    Task<bool> SlugExistsAsync(string slug, int? exceptId = null);
}
