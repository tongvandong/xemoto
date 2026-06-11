using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;

namespace MoToSale.Services.Catalog;

public interface ICatalogService
{
    Task<PagingResponse<ProductListItem>> SearchProductsAsync(ProductSearchRequest request);
    Task<ProductDetail?> GetProductAsync(int id);
    Task<int> CreateProductAsync(CreateProductRequest request);
    Task UpdateProductAsync(int id, UpdateProductRequest request);
    Task DeleteProductAsync(int id);

    Task<List<CategoryDto>> GetCategoriesAsync();
    Task<List<BrandDto>> GetBrandsAsync();
    Task<List<VehicleModelDto>> GetVehicleModelsAsync(int? brandId);
    Task<List<CategoryDto>> GetActiveCategoriesAsync();
    Task<List<BrandDto>> GetActiveBrandsAsync();
    Task<List<VehicleModelDto>> GetActiveVehicleModelsAsync();
    Task<List<SkuLookupDto>> GetSkusAsync();

    // Hãng xe
    Task<int> CreateBrandAsync(CreateBrandRequest request);
    Task UpdateBrandAsync(int id, UpdateBrandRequest request);
    Task SetBrandLogoAsync(int id, string url);
    Task DeleteBrandAsync(int id);

    // Dòng xe
    Task<int> CreateModelAsync(CreateModelRequest request);
    Task UpdateModelAsync(int id, UpdateModelRequest request);
    Task DeleteModelAsync(int id);

    // Danh mục
    Task<int> CreateCategoryAsync(CreateCategoryRequest request);
    Task UpdateCategoryAsync(int id, UpdateCategoryRequest request);
    Task DeleteCategoryAsync(int id);

    // Hãng sản xuất phụ tùng
    Task<List<ManufacturerDto>> GetManufacturersAsync();
    Task<int> CreateManufacturerAsync(SaveManufacturerRequest request);
    Task UpdateManufacturerAsync(int id, SaveManufacturerRequest request);
    Task SetManufacturerLogoAsync(int id, string url);
    Task DeleteManufacturerAsync(int id);

    // Tương thích phụ tùng
    Task<List<CompatibilityDto>> GetCompatibilitiesAsync(int productId);
    Task<int> CreateCompatibilityAsync(int productId, SaveCompatibilityRequest request);
    Task UpdateCompatibilityAsync(int productId, int id, SaveCompatibilityRequest request);
    Task DeleteCompatibilityAsync(int productId, int id);

    // Khuyến mãi, bán kèm, mã vạch và tuổi tồn
    Task<List<ProductPromotionDto>> GetPromotionsAsync(int productId);
    Task<List<ProductRelatedItemDto>> GetRelatedItemsAsync(int productId);
    Task<int> CreateRelatedItemAsync(int productId, SaveProductRelatedItemRequest request);
    Task UpdateRelatedItemAsync(int productId, int id, SaveProductRelatedItemRequest request);
    Task DeleteRelatedItemAsync(int productId, int id);
    Task<List<ProductInventoryAgingDto>> GetInventoryAgingAsync(int productId);
    Task<List<BarcodeLabelDto>> GetBarcodeLabelsAsync(int productId);

    // Biến thể (SKU)
    Task<List<SkuDto>> GetSkusByProductAsync(int productId);
    Task<int> CreateSkuAsync(int productId, CreateSkuRequest request);
    Task UpdateSkuAsync(int productId, int skuId, UpdateSkuRequest request);
    Task DeleteSkuAsync(int productId, int skuId);

    // Ảnh sản phẩm / ảnh biến thể
    Task<List<ProductImageDto>> GetImagesAsync(int productId);
    Task<int> AddImageAsync(int productId, AddImageRequest request);
    Task SetPrimaryImageAsync(int productId, int imageId);
    Task DeleteImageAsync(int productId, int imageId);
}

public class CatalogException : Exception
{
    public CatalogException(string message) : base(message) { }
}
