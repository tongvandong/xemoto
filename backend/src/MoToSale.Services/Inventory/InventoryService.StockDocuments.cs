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
    public async Task<int> CreateDocumentAsync(CreateStockDocumentRequest request, int? userId)
    {
        ValidateCreateDocumentRequest(request);

        DateTime now = DateTime.UtcNow;
        var document = new StockDocument
        {
            Code = $"PK{request.Type}{now:yyyyMMddHHmmss}",
            Type = request.Type,
            DocStatus = StockDocumentStatus.Draft,
            Note = BuildDocumentNote(request),
            CreatedBy = userId,
            CreatedDate = now,
            Lines = request.Lines
                .Select(line => new StockDocumentLine
                {
                    SkuId = line.SkuId,
                    Qty = line.Qty,
                    Note = line.Note,
                })
                .ToList(),
        };

        _documents.Add(document);
        await _documents.SaveChangesAsync();

        return document.Id;
    }

    public async Task ApproveDocumentAsync(int id, int? userId)
    {
        var document = await _documents.GetWithLinesAsync(id);
        if (document == null)
        {
            throw new InventoryException("Không tìm thấy phiếu kho.");
        }

        if (document.DocStatus != StockDocumentStatus.Draft)
        {
            throw new InventoryException("Chỉ phiếu ở trạng thái nháp mới được duyệt.");
        }

        DateTime now = DateTime.UtcNow;

        foreach (var line in document.Lines)
        {
            ValidateDocumentLine(line);
            await ApplyDocumentLineAsync(document, line, userId, now);
        }

        document.DocStatus = StockDocumentStatus.Approved;
        document.ApprovedBy = userId;
        document.ApprovedAt = now;
        document.UpdatedDate = now;

        await _documents.SaveChangesAsync();
    }

    public async Task CancelDocumentAsync(int id)
    {
        var document = await _documents.GetByIdAsync(id);
        if (document == null)
        {
            throw new InventoryException("Không tìm thấy phiếu kho.");
        }

        if (document.DocStatus != StockDocumentStatus.Draft)
        {
            throw new InventoryException("Chỉ phiếu nháp mới được hủy.");
        }

        document.DocStatus = StockDocumentStatus.Cancelled;
        document.UpdatedDate = DateTime.UtcNow;

        _documents.Update(document);
        await _documents.SaveChangesAsync();
    }
    private static void ValidateCreateDocumentRequest(CreateStockDocumentRequest request)
    {
        if (request.Lines == null || request.Lines.Count == 0)
        {
            throw new InventoryException("Phiếu kho phải có ít nhất một dòng.");
        }

        if (request.Type == (int)StockDocumentType.Transfer)
        {
            throw new InventoryException("Hệ thống chỉ có một kho, không còn nghiệp vụ chuyển kho.");
        }

        bool requiresReceiptReason = request.Type == (int)StockDocumentType.Receipt;
        bool reasonIsValid = !string.IsNullOrWhiteSpace(request.Reason)
            && ReceiptReasons.ContainsKey(request.Reason);

        if (requiresReceiptReason && !reasonIsValid)
        {
            throw new InventoryException("Nhập kho khác cần chọn lý do hợp lệ.");
        }
    }

    private static void ValidateDocumentLine(StockDocumentLine line)
    {
        if (line.Qty <= 0)
        {
            throw new InventoryException("Số lượng dòng phiếu phải lớn hơn 0.");
        }
    }
    private static string? BuildDocumentNote(CreateStockDocumentRequest request)
    {
        if (request.Type != (int)StockDocumentType.Receipt)
        {
            return request.Note;
        }

        string reasonLabel = ReceiptReasons[request.Reason!];
        return $"Lý do nhập kho khác: {reasonLabel}. {request.Note}".Trim();
    }

    private async Task ApplyDocumentLineAsync(StockDocument document, StockDocumentLine line, int? userId, DateTime now)
    {
        switch ((StockDocumentType)document.Type)
        {
            case StockDocumentType.Receipt:
                await ApplyAsync(line.SkuId, StockMovementType.Receipt, line.Qty, document.Id, document.Code, userId, now);
                break;
            case StockDocumentType.Issue:
                await ApplyAsync(line.SkuId, StockMovementType.Issue, -line.Qty, document.Id, document.Code, userId, now);
                break;
            case StockDocumentType.Adjustment:
            case StockDocumentType.Stocktake:
                await ApplyStocktakeDocumentLineAsync(document, line, userId, now);
                break;
            case StockDocumentType.Transfer:
                throw new InventoryException("Hệ thống chỉ có một kho, không còn nghiệp vụ chuyển kho.");
        }
    }
}
