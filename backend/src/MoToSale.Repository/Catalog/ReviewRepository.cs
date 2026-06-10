using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public class ReviewRepository : Repository<Review>, IReviewRepository
{
    public ReviewRepository(AppDbContext context) : base(context) { }

    public async Task<PagingResponse<ReviewDto>> SearchAsync(PagingRequest r, string? status)
    {
        var query =
            from rv in Set.AsNoTracking()
            join p in Context.Products.AsNoTracking() on rv.ProductId equals p.Id into ps
            from p in ps.DefaultIfEmpty()
            join u in Context.Users.AsNoTracking() on rv.UserId equals u.Id into us
            from u in us.DefaultIfEmpty()
            select new { rv, ProductName = p != null ? p.Name : "", UserName = u != null ? u.FullName : "" };

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.rv.ReviewStatus == status);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.rv.Id)
            .Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(x => new ReviewDto(x.rv.Id, x.rv.ProductId, x.ProductName, x.rv.UserId, x.UserName, x.rv.Rating, x.rv.Title, x.rv.Comment, x.rv.ImageUrl, x.rv.ReviewStatus, x.rv.CreatedDate))
            .ToListAsync();
        return new PagingResponse<ReviewDto> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }
}
