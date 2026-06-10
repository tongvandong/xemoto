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
}
