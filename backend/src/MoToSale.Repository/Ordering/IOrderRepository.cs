using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public interface IOrderRepository : IRepository<Order>
{
    Task<Order?> GetDetailAsync(int id);
    Task<List<Order>> GetByUserAsync(int userId);
    Task<PagingResponse<Order>> SearchAsync(OrderSearchRequest request);
    Task<List<OrderStatusHistory>> GetHistoriesAsync(int orderId);
    void AddStatusHistory(OrderStatusHistory history);
}
