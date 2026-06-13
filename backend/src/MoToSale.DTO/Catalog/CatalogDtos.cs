using MoToSale.DTO.Common;

namespace MoToSale.DTO.Catalog;

public class ProductSearchRequest : PagingRequest
{
    public int? CategoryId { get; set; }
    public int? BrandId { get; set; }
    public int? VehicleModelId { get; set; }
    public int? CompatibleVehicleModelId { get; set; }
    public int? Kind { get; set; }            // ProductKind
    public int? Status { get; set; }          // EntityStatus
    public bool? IsFeatured { get; set; }
    public bool? IsHotDeal { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? StockStatus { get; set; }  // InStock | LowStock | OutOfStock
    public bool? HasPromotion { get; set; }
    public string? SortBy { get; set; }       // name | price | newest
    public bool SortDescending { get; set; } = true;
}

public record SkuDto(int Id, string SkuCode, string? VariantName, string? Color, string? Version, decimal ListPrice, decimal? SalePrice, string? Barcode, int Status, int Available = 0);

public record SkuLookupDto(int Id, string SkuCode, string ProductName, decimal ListPrice, decimal? SalePrice);

public record CreateSkuRequest(string? SkuCode, string? VariantName, string? Color, string? Version, decimal ListPrice, decimal? SalePrice, string? Barcode);

public record UpdateSkuRequest(string? SkuCode, string? VariantName, string? Color, string? Version, decimal ListPrice, decimal? SalePrice, string? Barcode, int Status);

public record ProductImageDto(int Id, int? SkuId, string Url, string? Alt, bool IsPrimary, int SortOrder);

public record AddImageRequest(string Url, string? Alt, int? SkuId, bool IsPrimary, int SortOrder);

public record ManufacturerDto(int Id, string Name, string? LogoUrl, string? Description, int Status);
public record SaveManufacturerRequest(string Name, string? LogoUrl, string? Description, int Status);

public record ProductListItem(
    int Id, string Code, string Name, string Slug, int CategoryId, int? BrandId, int? VehicleModelId, int Kind,
    bool IsFeatured, bool IsHotDeal, decimal ListPrice, decimal? SalePrice, string? MainImageUrl,
    int? ManufacturerId, string? ManufacturerName, int StockTotal, int Status);

public record ProductDetail(
    int Id, string Code, string Name, string Slug, int CategoryId, int? BrandId, int? VehicleModelId,
    int Kind, string? ShortDescription, string? Description, bool IsFeatured, bool IsHotDeal,
    int? ManufacturerId, string? ManufacturerName, int Status, IEnumerable<SkuDto> Skus, IEnumerable<ProductImageDto> Images);

public record CategoryDto(int Id, int? ParentId, string Name, string Slug, int Kind, int SortOrder, int Status);

public record BrandDto(int Id, string Name, string Slug, string? LogoUrl, int Status);

public record VehicleModelDto(int Id, int BrandId, string Name, string Slug, int Status);

public record CreateBrandRequest(string Name, string? Slug, string? LogoUrl);
public record UpdateBrandRequest(string Name, string? Slug, string? LogoUrl, int Status);

public record CreateModelRequest(int BrandId, string Name, string? Slug);
public record UpdateModelRequest(int BrandId, string Name, string? Slug, int Status);

public record CreateCategoryRequest(int? ParentId, string Name, string? Slug, int Kind, int SortOrder);
public record UpdateCategoryRequest(int? ParentId, string Name, string? Slug, int Kind, int SortOrder, int Status);

public record ReviewDto(int Id, int ProductId, string ProductName, int UserId, string UserName, int Rating, string? Title, string? Comment, string? ImageUrl, string ReviewStatus, DateTime CreatedDate);
public record UpdateReviewStatusRequest(string Status);

// ===== Storefront (khách hàng) =====
// ReviewStatus để khách thấy đánh giá của mình đã duyệt hay chưa; ImageUrl hiển thị ảnh đính kèm (nếu có).
public record ProductReviewItem(int Id, int Rating, string? Title, string? Comment, string UserName, DateTime CreatedDate, string? ReviewStatus = null, string? ImageUrl = null);
public record ProductReviewSummary(int ProductId, int TotalReviews, double AverageRating);
public record MyReviewState(int ProductId, bool IsAuthenticated, bool HasPurchased, bool CanReview, int? EligibleOrderId, string? Reason, ProductReviewItem? MyReview);
public record CreateReviewRequest(int Rating, string? Title, string? Comment, int? OrderId);

public record FavoriteDto(int Id, int UserId, int ProductId, DateTime CreatedDate, ProductDetail? Product);

public record CompatibilityDto(int Id, int PartProductId, int? BrandId, string? BrandName, int? VehicleModelId, string? VehicleModelName, short? YearFrom, short? YearTo, bool AppliesToAll, string? Note, int Status);
public record SaveCompatibilityRequest(int? BrandId, int? VehicleModelId, short? YearFrom, short? YearTo, bool AppliesToAll, string? Note);

public record ProductPromotionDto(int Id, string Code, string DiscountType, decimal DiscountValue, decimal? MaxDiscount, decimal MinOrderValue, DateTime? StartAt, DateTime? EndAt, string ScopeType, int RefId, string Description, int UsedCount, int? UsageLimit);

public record ProductRelatedItemDto(int Id, int ProductId, int RelatedProductId, string RelatedProductCode, string RelatedProductName, string RelationType, string? Note, int SortOrder, int StockTotal, decimal ListPrice, decimal? SalePrice);
public record SaveProductRelatedItemRequest(int RelatedProductId, string RelationType, string? Note, int SortOrder);

public record ProductInventoryAgingDto(int SkuId, string SkuCode, string ProductName, string? VariantName, int OnHand, int Reserved, int Available, DateTime? FirstStockAt, DateTime? LastStockInAt, DateTime? LastSoldAt, int DaysInStock, int DaysSinceLastSale, string AgingStatus);

public record BarcodeLabelDto(int ProductId, int SkuId, string ProductCode, string ProductName, string SkuCode, string? VariantName, string Barcode, decimal Price);

public record CreateProductRequest(
    string Code, string Name, string? Slug, int CategoryId, int? BrandId, int? VehicleModelId,
    int Kind, string? ShortDescription, string? Description, bool IsFeatured, bool IsHotDeal,
    decimal ListPrice, decimal? SalePrice, int? ManufacturerId = null);

public record UpdateProductRequest(
    string Name, string? Slug, int CategoryId, int? BrandId, int? VehicleModelId,
    string? ShortDescription, string? Description, bool IsFeatured, bool IsHotDeal,
    decimal ListPrice, decimal? SalePrice, int Status,
    int? ManufacturerId = null);

public class ProductImageUploadResponse
{
    public int Id { get; set; }

    public string Url { get; set; } = string.Empty;
}

public class ProductReviewResponse
{
    public ProductReviewItem Review { get; set; } = null!;
}
