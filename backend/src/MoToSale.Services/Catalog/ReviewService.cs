using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;

namespace MoToSale.Services.Catalog;

public class ReviewService : IReviewService
{
    private static readonly HashSet<string> Allowed = new() { "Pending", "Approved", "Rejected", "Hidden" };
    private readonly IReviewRepository _reviews;
    private readonly AppDbContext _db;

    public ReviewService(IReviewRepository reviews, AppDbContext db)
    {
        _reviews = reviews;
        _db = db;
    }

    public Task<PagingResponse<ReviewDto>> SearchAsync(PagingRequest request, string? status, int? rating) => _reviews.SearchAsync(request, status, rating);

    public async Task UpdateStatusAsync(int id, string status)
    {
        if (!Allowed.Contains(status)) throw new CatalogException("Trạng thái không hợp lệ.");
        var rv = await _reviews.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy đánh giá.");
        rv.ReviewStatus = status;
        rv.UpdatedDate = DateTime.UtcNow;
        _reviews.Update(rv);
        await _reviews.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var rv = await _reviews.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy đánh giá.");
        _reviews.Delete(rv);
        await _reviews.SaveChangesAsync();
    }

    // ===== Storefront =====
    public async Task<List<ProductReviewItem>> GetProductReviewsAsync(int productId)
    {
        return await _db.Reviews
            .Where(r => r.ProductId == productId && r.ReviewStatus == "Approved")
            .OrderByDescending(r => r.CreatedDate)
            .Join(_db.Users, r => r.UserId, u => u.Id,
                (r, u) => new ProductReviewItem(r.Id, r.Rating, r.Title, r.Comment, u.FullName, r.CreatedDate, r.ReviewStatus, r.ImageUrl))
            .ToListAsync();
    }

    public async Task<ProductReviewSummary> GetProductReviewSummaryAsync(int productId)
    {
        var approved = _db.Reviews.Where(r => r.ProductId == productId && r.ReviewStatus == "Approved");
        var total = await approved.CountAsync();
        var avg = total > 0 ? await approved.AverageAsync(r => (double)r.Rating) : 0d;
        return new ProductReviewSummary(productId, total, Math.Round(avg, 1));
    }

    private async Task<int?> EligibleOrderIdAsync(int productId, int userId)
    {
        var orderId = await (
            from o in _db.Orders
            where o.UserId == userId && (o.OrderStatus == "Delivered" || o.OrderStatus == "Completed")
            join l in _db.OrderLines on o.Id equals l.OrderId
            join s in _db.Skus on l.SkuId equals s.Id
            where s.ProductId == productId
            orderby o.Id descending
            select (int?)o.Id).FirstOrDefaultAsync();
        return orderId;
    }

    private async Task<ProductReviewItem?> MyReviewItemAsync(int productId, int userId)
    {
        return await _db.Reviews
            .Where(r => r.ProductId == productId && r.UserId == userId)
            .Join(_db.Users, r => r.UserId, u => u.Id,
                (r, u) => new ProductReviewItem(r.Id, r.Rating, r.Title, r.Comment, u.FullName, r.CreatedDate, r.ReviewStatus, r.ImageUrl))
            .FirstOrDefaultAsync();
    }

    public async Task<MyReviewState> GetMyReviewStateAsync(int productId, int? userId)
    {
        if (userId is null) return new MyReviewState(productId, false, false, false, null, null, null);
        var eligible = await EligibleOrderIdAsync(productId, userId.Value);
        var mine = await MyReviewItemAsync(productId, userId.Value);
        var canReview = eligible.HasValue && mine is null;
        var reason = eligible.HasValue ? (mine is null ? null : "Bạn đã đánh giá sản phẩm này.") : "Bạn cần mua sản phẩm trước khi đánh giá.";
        return new MyReviewState(productId, true, eligible.HasValue, canReview, eligible, reason, mine);
    }

    public async Task<ProductReviewItem> CreateProductReviewAsync(int productId, int userId, CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5) throw new CatalogException("Điểm đánh giá phải từ 1 đến 5.");
        var eligible = await EligibleOrderIdAsync(productId, userId);
        if (eligible is null) throw new CatalogException("Bạn cần mua sản phẩm trước khi đánh giá.");
        if (await _db.Reviews.AnyAsync(r => r.ProductId == productId && r.UserId == userId))
            throw new CatalogException("Bạn đã đánh giá sản phẩm này.");

        var now = DateTime.UtcNow;
        var review = new Review
        {
            ProductId = productId,
            UserId = userId,
            OrderId = request.OrderId ?? eligible,
            Rating = request.Rating,
            Title = request.Title,
            Comment = request.Comment,
            ReviewStatus = "Pending",
            CreatedDate = now
        };
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();
        return (await MyReviewItemAsync(productId, userId))!;
    }

    public async Task<ProductReviewItem> UpdateMyProductReviewAsync(int productId, int userId, CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5) throw new CatalogException("Điểm đánh giá phải từ 1 đến 5.");
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.ProductId == productId && r.UserId == userId)
            ?? throw new CatalogException("Bạn chưa có đánh giá cho sản phẩm này.");
        review.Rating = request.Rating;
        review.Title = request.Title;
        review.Comment = request.Comment;
        review.ReviewStatus = "Pending"; // chờ duyệt lại sau khi sửa
        review.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await MyReviewItemAsync(productId, userId))!;
    }
}
