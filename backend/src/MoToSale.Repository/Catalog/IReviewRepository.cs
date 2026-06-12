using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Catalog;

public interface IReviewRepository : IRepository<Review>
{
    Task<PagingResponse<ReviewDto>> SearchAsync(PagingRequest request, string? status, int? rating);
}
