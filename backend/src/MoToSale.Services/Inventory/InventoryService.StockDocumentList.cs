using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;

namespace MoToSale.Services.Inventory;

public partial class InventoryService
{
    public async Task<PagingResponse<StockDocumentListItemDto>> SearchStockDocumentListAsync(StockDocumentSearchRequest request)
    {
        IQueryable<StockDocumentListItemDto> manualDocuments = BuildManualStockDocumentQuery();
        IQueryable<StockDocumentListItemDto> purchaseReceipts = BuildGoodsReceiptDocumentQuery();

        IQueryable<StockDocumentListItemDto> query = manualDocuments.Concat(purchaseReceipts);

        query = ApplyStockDocumentListFilters(query, request);

        int totalItems = await query.CountAsync();

        query = ApplyStockDocumentListSorting(query, request);

        List<StockDocumentListItemDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<StockDocumentListItemDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    private IQueryable<StockDocumentListItemDto> BuildManualStockDocumentQuery()
    {
        return _db.StockDocuments
            .AsNoTracking()
            .Select(document => new StockDocumentListItemDto
            {
                Id = document.Id,
                Code = document.Code,
                Type = document.Type == 1 ? "1"
                    : document.Type == 2 ? "2"
                    : document.Type == 3 ? "3"
                    : document.Type == 4 ? "4"
                    : document.Type == 5 ? "5"
                    : "0",
                Status = document.DocStatus,
                Note = document.Note,
                CreatedDate = document.CreatedDate,
                ApprovedAt = document.ApprovedAt,
                LineCount = document.Lines.Count,
                Source = "StockDocument",
                SourceLabel = "Phiếu kho thủ công"
            });
    }

    private IQueryable<StockDocumentListItemDto> BuildGoodsReceiptDocumentQuery()
    {
        return
            from receipt in _db.GoodsReceipts.AsNoTracking()
            join order in _db.PurchaseOrders.AsNoTracking() on receipt.PurchaseOrderId equals order.Id
            join supplier in _db.Suppliers.AsNoTracking() on order.SupplierId equals supplier.Id
            select new StockDocumentListItemDto
            {
                Id = receipt.Id,
                Code = receipt.Code,
                Type = "PurchaseReceipt",
                Status = StockDocumentStatus.Approved,
                Note = receipt.Note,
                CreatedDate = receipt.ReceivedAt,
                ApprovedAt = receipt.ReceivedAt,
                LineCount = receipt.Lines.Count,
                Source = "GoodsReceipt",
                SourceLabel = "Đơn mua " + order.Code + " - " + supplier.Name
            };
    }

    private static IQueryable<StockDocumentListItemDto> ApplyStockDocumentListFilters(
        IQueryable<StockDocumentListItemDto> query,
        StockDocumentSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword.Trim();
            query = query.Where(document =>
                document.Code.Contains(keyword)
                || document.SourceLabel.Contains(keyword)
                || (document.Note != null && document.Note.Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(request.Source))
        {
            string source = request.Source.Trim();
            query = query.Where(document => document.Source == source);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            string status = request.Status.Trim();
            query = query.Where(document => document.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            string type = request.Type.Trim();
            if (type == "stocktake")
            {
                query = query.Where(document => document.Type == "3" || document.Type == "4");
            }
            else
            {
                query = query.Where(document => document.Type == type);
            }
        }

        if (request.CreatedFrom.HasValue)
        {
            DateTime createdFrom = request.CreatedFrom.Value.Date;
            query = query.Where(document => document.CreatedDate >= createdFrom);
        }

        if (request.CreatedTo.HasValue)
        {
            DateTime createdTo = request.CreatedTo.Value.Date.AddDays(1);
            query = query.Where(document => document.CreatedDate < createdTo);
        }

        return query;
    }

    private static IQueryable<StockDocumentListItemDto> ApplyStockDocumentListSorting(
        IQueryable<StockDocumentListItemDto> query,
        StockDocumentSearchRequest request)
    {
        string sortBy = string.IsNullOrWhiteSpace(request.SortBy)
            ? "createdDate"
            : request.SortBy.Trim().ToLowerInvariant();

        bool descending = request.SortDescending;

        return sortBy switch
        {
            "code" => descending
                ? query.OrderByDescending(document => document.Code)
                : query.OrderBy(document => document.Code),
            "type" => descending
                ? query.OrderByDescending(document => document.Type)
                : query.OrderBy(document => document.Type),
            "source" or "sourcelabel" => descending
                ? query.OrderByDescending(document => document.SourceLabel)
                : query.OrderBy(document => document.SourceLabel),
            "status" => descending
                ? query.OrderByDescending(document => document.Status)
                : query.OrderBy(document => document.Status),
            "linecount" => descending
                ? query.OrderByDescending(document => document.LineCount)
                : query.OrderBy(document => document.LineCount),
            "approvedat" => descending
                ? query.OrderByDescending(document => document.ApprovedAt)
                : query.OrderBy(document => document.ApprovedAt),
            "createddate" or "createdat" or "date" => descending
                ? query.OrderByDescending(document => document.CreatedDate)
                : query.OrderBy(document => document.CreatedDate),
            _ => descending
                ? query.OrderByDescending(document => document.CreatedDate)
                : query.OrderBy(document => document.CreatedDate),
        };
    }
}
