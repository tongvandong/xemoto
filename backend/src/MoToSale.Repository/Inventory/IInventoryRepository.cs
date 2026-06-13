using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public interface IInventoryRepository : IRepository<InventoryItem>
{
    Task<InventoryItem?> GetItemAsync(int skuId);
    Task<InventoryItem> GetOrCreateItemAsync(int skuId);
    void AddMovement(StockMovement movement);
    Task<int> GetOnHandTotalAsync(int skuId);
    Task<Dictionary<int, int>> GetOnHandBySkusAsync(IEnumerable<int> skuIds);
    Task<InventorySummary> GetSummaryAsync();
    Task<DateTime?> GetLastUpdatedAtAsync();
    Task<int> SyncFromLedgerAsync();
    Task<List<InventoryItem>> GetAllForExportAsync();
    Task<PagingResponse<InventoryItemDto>> SearchAsync(InventorySearchRequest request);
    Task<int> GetTotalAvailableAsync(int skuId);
    Task<List<StockMovementDto>> GetMovementsAsync(int? skuId, int take = 200);

    // Giữ chỗ tồn kho theo cách ATOMIC (1 câu UPDATE có điều kiện) để hai request mua
    // song song không thể cùng giữ quá tồn khả dụng. Trả false nếu tồn không đủ.
    Task<bool> TryReserveAsync(int skuId, int qty, DateTime now);

    // Xuất kho (trừ OnHand) atomic, chống bán âm khi nhiều thao tác chạy đồng thời.
    Task<bool> TryIssueAsync(int skuId, int qty, DateTime now);
}
