using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Payments;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Payments;

public interface IPaymentRepository : IRepository<Payment>
{
    Task<List<Payment>> GetByOrderAsync(int orderId);
    Task<decimal> GetTotalPaidAsync(int orderId);
    Task<PagingResponse<PaymentListItem>> SearchAsync(PagingRequest request, string? status);
}
