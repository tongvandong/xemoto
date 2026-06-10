using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Inventory;

public class StockDocumentRepository : Repository<StockDocument>, IStockDocumentRepository
{
    public StockDocumentRepository(AppDbContext context) : base(context) { }

    public Task<StockDocument?> GetWithLinesAsync(int id) =>
        Set.Include(d => d.Lines).FirstOrDefaultAsync(d => d.Id == id);

    public async Task<PagingResponse<StockDocumentDto>> SearchAsync(PagingRequest r, string? status, int? type)
    {
        var query = Set.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.DocStatus == status);
        if (type.HasValue) query = query.Where(x => x.Type == type);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.Id)
            .Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(x => new StockDocumentDto(
                x.Id, x.Code, x.Type, x.DocStatus, x.Note, x.CreatedDate, x.ApprovedAt, x.Lines.Count))
            .ToListAsync();

        return new PagingResponse<StockDocumentDto> { Items = rows, Page = r.Page, PageSize = r.PageSize, TotalItems = total };
    }

    public async Task<StockDocumentDetail?> GetDetailAsync(int id)
    {
        var header = await Set.AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new StockDocumentDto(
                d.Id, d.Code, d.Type, d.DocStatus, d.Note, d.CreatedDate, d.ApprovedAt, d.Lines.Count))
            .FirstOrDefaultAsync();

        if (header is null) return null;

        var lines = await (
            from l in Context.StockDocumentLines.AsNoTracking()
            join s in Context.Skus.AsNoTracking() on l.SkuId equals s.Id
            join p in Context.Products.AsNoTracking() on s.ProductId equals p.Id
            where l.StockDocumentId == id
            select new StockDocumentLineDto(l.Id, l.SkuId, s.SkuCode, p.Name, l.Qty, l.Note))
            .ToListAsync();

        return new StockDocumentDetail(header, lines);
    }
}
