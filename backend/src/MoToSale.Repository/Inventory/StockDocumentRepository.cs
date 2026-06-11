using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class StockDocumentRepository : Repository<StockDocument>, IStockDocumentRepository
{
    public StockDocumentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<StockDocument?> GetWithLinesAsync(int id)
    {
        StockDocument? document = await Set
            .Include(item => item.Lines)
            .FirstOrDefaultAsync(item => item.Id == id);

        return document;
    }

    public async Task<PagingResponse<StockDocumentDto>> SearchAsync(PagingRequest request, string? status, int? type)
    {
        IQueryable<StockDocument> query = Set.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(document => document.DocStatus == status);
        }

        if (type.HasValue)
        {
            int typeValue = type.Value;
            query = query.Where(document => document.Type == typeValue);
        }

        int totalItems = await query.CountAsync();

        List<StockDocumentDto> items = await query
            .OrderByDescending(document => document.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(document => new StockDocumentDto(
                document.Id,
                document.Code,
                document.Type,
                document.DocStatus,
                document.Note,
                document.CreatedDate,
                document.ApprovedAt,
                document.Lines.Count))
            .ToListAsync();

        return new PagingResponse<StockDocumentDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<StockDocumentDetail?> GetDetailAsync(int id)
    {
        StockDocumentDto? header = await Set
            .AsNoTracking()
            .Where(document => document.Id == id)
            .Select(document => new StockDocumentDto(
                document.Id,
                document.Code,
                document.Type,
                document.DocStatus,
                document.Note,
                document.CreatedDate,
                document.ApprovedAt,
                document.Lines.Count))
            .FirstOrDefaultAsync();

        if (header == null)
        {
            return null;
        }

        List<StockDocumentLineDto> lines = await (
            from line in Context.StockDocumentLines.AsNoTracking()
            join sku in Context.Skus.AsNoTracking() on line.SkuId equals sku.Id
            join product in Context.Products.AsNoTracking() on sku.ProductId equals product.Id
            where line.StockDocumentId == id
            select new StockDocumentLineDto(
                line.Id,
                line.SkuId,
                sku.SkuCode,
                product.Name,
                line.Qty,
                line.Note))
            .ToListAsync();

        return new StockDocumentDetail(header, lines);
    }
}
