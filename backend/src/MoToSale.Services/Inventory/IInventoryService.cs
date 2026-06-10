using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;

namespace MoToSale.Services.Inventory;

public interface IInventoryService
{
    Task<InventoryListResult> GetInventoryAsync(InventorySearchRequest request);
    Task<List<StockMovementDto>> GetMovementsAsync(int? skuId);
    Task<PagingResponse<StockDocumentDto>> SearchDocumentsAsync(PagingRequest request, string? status, int? type);
    Task<StockDocumentDetail?> GetDocumentAsync(int id);
    Task<int> CreateDocumentAsync(CreateStockDocumentRequest request, int? userId);
    Task ApproveDocumentAsync(int id, int? userId);
    Task CancelDocumentAsync(int id);

    Task AdjustStockAsync(AdjustStockRequest request, int? userId);
    Task UpdateThresholdAsync(UpdateThresholdRequest request);
    Task<List<HoldDto>> GetHoldsAsync();
    Task<int> SyncAsync();
    Task<List<InventoryItemDto>> ExportAsync();
}

public class InventoryException : Exception
{
    public InventoryException(string message) : base(message) { }
}
