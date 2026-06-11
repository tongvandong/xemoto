using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ReviewRepository : Repository<Review>, IReviewRepository
{
    public ReviewRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagingResponse<ReviewDto>> SearchAsync(PagingRequest request, string? status)
    {
        var query =
            from review in Set.AsNoTracking()
            join product in Context.Products.AsNoTracking() on review.ProductId equals product.Id into products
            from product in products.DefaultIfEmpty()
            join user in Context.Users.AsNoTracking() on review.UserId equals user.Id into users
            from user in users.DefaultIfEmpty()
            select new
            {
                Review = review,
                ProductName = product.Name,
                UserName = user.FullName
            };

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(row => row.Review.ReviewStatus == status);
        }

        int totalItems = await query.CountAsync();

        List<ReviewDto> items = await query
            .OrderByDescending(row => row.Review.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(row => new ReviewDto(
                row.Review.Id,
                row.Review.ProductId,
                row.ProductName,
                row.Review.UserId,
                row.UserName,
                row.Review.Rating,
                row.Review.Title,
                row.Review.Comment,
                row.Review.ImageUrl,
                row.Review.ReviewStatus,
                row.Review.CreatedDate))
            .ToListAsync();

        return new PagingResponse<ReviewDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }
}
