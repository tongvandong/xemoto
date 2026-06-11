using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;

namespace MoToSale.Services.Inventory;
public partial class InventoryService
{
    public async Task<InventoryListResult> GetInventoryAsync(InventorySearchRequest request)
    {
        var page = await _inventory.SearchAsync(request);
        var summary = await _inventory.GetSummaryAsync();
        var lastSyncAt = await _inventory.GetLastUpdatedAtAsync();

        return new InventoryListResult(
            page.Items,
            page.Page,
            page.PageSize,
            page.TotalItems,
            page.TotalPages,
            summary,
            lastSyncAt);
    }

    public async Task<List<StockMovementDto>> GetMovementsAsync(int? skuId)
    {
        return await _inventory.GetMovementsAsync(skuId);
    }

    public async Task<PagingResponse<StockDocumentDto>> SearchDocumentsAsync(PagingRequest request, string? status, int? type)
    {
        return await _documents.SearchAsync(request, status, type);
    }

    public async Task<StockDocumentDetail?> GetDocumentAsync(int id)
    {
        return await _documents.GetDetailAsync(id);
    }
    public async Task<List<HoldDto>> GetHoldsAsync()
    {
        return await _reservations.GetHoldsAsync();
    }

    public async Task<int> SyncAsync()
    {
        return await _inventory.SyncFromLedgerAsync();
    }

    public async Task<List<InventoryItemDto>> ExportAsync()
    {
        var page = await _inventory.SearchAsync(new InventorySearchRequest
        {
            Page = 1,
            PageSize = 100000
        });

        return page.Items.ToList();
    }
}
