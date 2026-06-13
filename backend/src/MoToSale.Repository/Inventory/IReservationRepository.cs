using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public interface IReservationRepository : IRepository<Reservation>
{
    Task<int> GetActiveQtyAsync(int skuId);
    Task<List<Reservation>> GetByOrderAsync(int orderId);
    Task<List<HoldDto>> GetHoldsAsync();

    // Mã đơn có giữ chỗ Active đã quá hạn — dùng cho job tự hủy đơn bỏ quên, trả tồn về kho.
    Task<List<int>> GetExpiredActiveOrderIdsAsync(DateTime asOf);
}
