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
    public async Task<PagingResponse<GoodsReceiptDto>> SearchGoodsReceiptsAsync(PagingRequest request)
    {
        var query =
            from receipt in _db.GoodsReceipts.AsNoTracking()
            join order in _db.PurchaseOrders.AsNoTracking() on receipt.PurchaseOrderId equals order.Id
            join supplier in _db.Suppliers.AsNoTracking() on order.SupplierId equals supplier.Id
            orderby receipt.ReceivedAt descending
            select new GoodsReceiptDto(
                receipt.Id,
                receipt.Code,
                order.Id,
                order.Code,
                supplier.Name,
                receipt.Note,
                receipt.ReceivedAt,
                receipt.Lines.Count);

        int totalItems = await query.CountAsync();

        List<GoodsReceiptDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<GoodsReceiptDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<GoodsReceiptDetail?> GetGoodsReceiptAsync(int id)
    {
        GoodsReceiptDto? receipt = await (
            from row in _db.GoodsReceipts.AsNoTracking()
            join order in _db.PurchaseOrders.AsNoTracking() on row.PurchaseOrderId equals order.Id
            join supplier in _db.Suppliers.AsNoTracking() on order.SupplierId equals supplier.Id
            where row.Id == id
            select new GoodsReceiptDto(
                row.Id,
                row.Code,
                order.Id,
                order.Code,
                supplier.Name,
                row.Note,
                row.ReceivedAt,
                row.Lines.Count))
            .FirstOrDefaultAsync();

        if (receipt == null)
        {
            return null;
        }

        List<GoodsReceiptLineDto> lines = await (
            from line in _db.GoodsReceiptLines.AsNoTracking()
            join sku in _db.Skus.AsNoTracking() on line.SkuId equals sku.Id
            join product in _db.Products.AsNoTracking() on sku.ProductId equals product.Id
            where line.GoodsReceiptId == id
            select new GoodsReceiptLineDto(line.Id, sku.Id, sku.SkuCode, product.Name, line.Qty, line.UnitCost))
            .ToListAsync();

        return new GoodsReceiptDetail(receipt, lines);
    }
}
