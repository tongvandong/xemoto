using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public interface IStockDocumentRepository : IRepository<StockDocument>
{
    Task<StockDocument?> GetWithLinesAsync(int id);
    Task<PagingResponse<StockDocumentDto>> SearchAsync(PagingRequest request, string? status, int? type);
    Task<StockDocumentDetail?> GetDetailAsync(int id);
}
