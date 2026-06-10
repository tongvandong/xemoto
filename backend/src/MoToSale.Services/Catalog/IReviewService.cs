using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;

namespace MoToSale.Services.Catalog;

public interface IReviewService
{
    Task<PagingResponse<ReviewDto>> SearchAsync(PagingRequest request, string? status);
    Task UpdateStatusAsync(int id, string status);
    Task DeleteAsync(int id);

    // ===== Storefront (khách hàng) =====
    Task<List<ProductReviewItem>> GetProductReviewsAsync(int productId);
    Task<ProductReviewSummary> GetProductReviewSummaryAsync(int productId);
    Task<MyReviewState> GetMyReviewStateAsync(int productId, int? userId);
    Task<ProductReviewItem> CreateProductReviewAsync(int productId, int userId, CreateReviewRequest request);
    Task<ProductReviewItem> UpdateMyProductReviewAsync(int productId, int userId, CreateReviewRequest request);
}
