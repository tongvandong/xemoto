using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public partial class AdvancedOperationsService : IAdvancedOperationsService
{
    private readonly AppDbContext _db;

    public AdvancedOperationsService(AppDbContext db) => _db = db;

    public async Task<List<SalesReturnDto>> GetReturnsAsync(string? status)
    {
        var q = _db.SalesReturns.AsNoTracking().Include(x => x.Lines).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.ReturnStatus == status);
        return (await q.OrderByDescending(x => x.Id).ToListAsync()).Select(MapReturn).ToList();
    }

    public async Task<SalesReturnDto?> GetReturnAsync(int id)
    {
        var row = await _db.SalesReturns.AsNoTracking().Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id);
        return row is null ? null : MapReturn(row);
    }

    public async Task<int> CreateReturnAsync(CreateSalesReturnRequest r, int? userId)
    {
        if (string.IsNullOrWhiteSpace(r.Reason)) throw new AdvancedOperationsException("Lý do trả hàng là bắt buộc.");
        if (r.Lines is null || r.Lines.Count == 0) throw new AdvancedOperationsException("Phiếu trả hàng phải có ít nhất một sản phẩm.");
        if (r.Lines.GroupBy(x => x.OrderLineId).Any(x => x.Count() > 1))
            throw new AdvancedOperationsException("Một sản phẩm chỉ được xuất hiện một lần trong phiếu trả hàng.");
        await using var transaction = await BeginSerializableTransactionAsync();
        var order = await _db.Orders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == r.OrderId)
            ?? throw new AdvancedOperationsException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus != OrderStatus.Delivered)
            throw new AdvancedOperationsException("Chỉ đơn đã giao mới được trả hàng.");
        var now = DateTime.UtcNow;
        var salesReturn = new SalesReturn
        {
            Code = $"RT{now:yyyyMMddHHmmssfff}",
            OrderId = order.Id,
            Reason = r.Reason.Trim(),
            Note = r.Note,
            ReturnStatus = "Draft",
            CreatedBy = userId,
            CreatedDate = now,
        };
        foreach (var line in r.Lines)
        {
            var orderLine = order.Lines.FirstOrDefault(x => x.Id == line.OrderLineId)
                ?? throw new AdvancedOperationsException("Không tìm thấy sản phẩm trong đơn hàng.");
            var returned = await _db.SalesReturnLines
                .Where(x => x.OrderLineId == line.OrderLineId && x.SalesReturn.ReturnStatus != "Rejected")
                .SumAsync(x => (int?)x.Qty) ?? 0;
            if (line.Qty <= 0 || returned + line.Qty > orderLine.Qty)
                throw new AdvancedOperationsException($"Số lượng trả của {orderLine.ProductNameSnapshot} vượt quá số lượng còn có thể trả.");
            salesReturn.Lines.Add(new SalesReturnLine
            {
                OrderLineId = orderLine.Id,
                SkuId = orderLine.SkuId,
                Qty = line.Qty,
                UnitPrice = orderLine.UnitPrice,
                LineTotal = orderLine.UnitPrice * line.Qty,
                ItemCondition = NormalizeReturnItemCondition(line.ItemCondition),
                CreatedDate = now,
            });
        }
        _db.SalesReturns.Add(salesReturn);
        await _db.SaveChangesAsync();
        if (transaction is not null) await transaction.CommitAsync();
        return salesReturn.Id;
    }

    public async Task UpdateReturnAsync(int id, UpdateSalesReturnRequest r, int? userId)
    {
        ValidateReturnRequest(r.Reason, r.Lines);
        await using var transaction = await BeginSerializableTransactionAsync();
        var row = await _db.SalesReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new AdvancedOperationsException("Không tìm thấy phiếu trả hàng.");
        if (row.ReturnStatus != "Draft")
            throw new AdvancedOperationsException("Chỉ phiếu chờ duyệt mới được sửa.");

        var order = await LoadReturnableOrderAsync(r.OrderId);
        var now = DateTime.UtcNow;
        var lines = await BuildReturnLinesAsync(order, r.Lines, now, row.Id);

        _db.SalesReturnLines.RemoveRange(row.Lines);
        row.Lines.Clear();
        foreach (var line in lines) row.Lines.Add(line);

        row.OrderId = order.Id;
        row.Reason = r.Reason.Trim();
        row.Note = r.Note;
        row.UpdatedDate = now;
        await _db.SaveChangesAsync();
        if (transaction is not null) await transaction.CommitAsync();
    }

    private static void ValidateReturnRequest(string reason, List<CreateSalesReturnLineRequest>? lines)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new AdvancedOperationsException("Lý do trả hàng là bắt buộc.");
        if (lines is null || lines.Count == 0)
            throw new AdvancedOperationsException("Phiếu trả hàng phải có ít nhất một sản phẩm.");
        if (lines.GroupBy(x => x.OrderLineId).Any(x => x.Count() > 1))
            throw new AdvancedOperationsException("Một sản phẩm chỉ được xuất hiện một lần trong phiếu trả hàng.");
    }

    private async Task<Order> LoadReturnableOrderAsync(int orderId)
    {
        var order = await _db.Orders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == orderId)
            ?? throw new AdvancedOperationsException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus != OrderStatus.Delivered)
            throw new AdvancedOperationsException("Chỉ đơn đã giao mới được trả hàng.");
        return order;
    }

    private async Task<List<SalesReturnLine>> BuildReturnLinesAsync(
        Order order,
        IEnumerable<CreateSalesReturnLineRequest> requestLines,
        DateTime now,
        int? currentReturnId)
    {
        var lines = new List<SalesReturnLine>();
        foreach (var line in requestLines)
        {
            var orderLine = order.Lines.FirstOrDefault(x => x.Id == line.OrderLineId)
                ?? throw new AdvancedOperationsException("Không tìm thấy sản phẩm trong đơn hàng.");
            var returned = await _db.SalesReturnLines
                .Where(x => x.OrderLineId == line.OrderLineId
                    && (!currentReturnId.HasValue || x.SalesReturnId != currentReturnId.Value)
                    && x.SalesReturn.ReturnStatus != "Rejected")
                .SumAsync(x => (int?)x.Qty) ?? 0;
            if (line.Qty <= 0 || returned + line.Qty > orderLine.Qty)
                throw new AdvancedOperationsException($"Số lượng trả của {orderLine.ProductNameSnapshot} vượt quá số lượng còn có thể trả.");

            lines.Add(new SalesReturnLine
            {
                OrderLineId = orderLine.Id,
                SkuId = orderLine.SkuId,
                Qty = line.Qty,
                UnitPrice = orderLine.UnitPrice,
                LineTotal = orderLine.UnitPrice * line.Qty,
                ItemCondition = NormalizeReturnItemCondition(line.ItemCondition),
                CreatedDate = now,
            });
        }
        return lines;
    }

    private SalesReturnDto MapReturn(SalesReturn x)
    {
        var order = _db.Orders.AsNoTracking().Include(o => o.Lines).First(o => o.Id == x.OrderId);
        var lines = x.Lines.Select(l =>
        {
            var orderLine = _db.OrderLines.AsNoTracking().First(o => o.Id == l.OrderLineId);
            return new SalesReturnLineDto(l.Id, l.OrderLineId, l.SkuId, orderLine.ProductNameSnapshot, orderLine.SkuCodeSnapshot, l.Qty, l.UnitPrice, l.LineTotal, l.ItemCondition);
        }).ToList();
        return new SalesReturnDto(x.Id, x.Code, x.OrderId, order.Code, x.ReturnStatus, x.Reason, x.Note, x.RefundAmount, CalculateRefundableAmount(order, x.Lines.Select(l => (l.OrderLineId, l.Qty))), x.CreatedDate, x.ApprovedAt, lines);
    }

    private async Task<IDbContextTransaction?> BeginSerializableTransactionAsync() =>
        _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;

    private static string NormalizeReturnItemCondition(string? itemCondition) =>
        itemCondition == "Resellable" ? "Resellable" : "Damaged";

    private static decimal CalculateRefundableAmount(Entities.Ordering.Order order, IEnumerable<(int OrderLineId, int Qty)> lines)
    {
        if (order.Subtotal <= 0) return 0;
        var merchandiseRate = Math.Max(0, order.Subtotal - order.DiscountTotal) / order.Subtotal;
        var byId = order.Lines.ToDictionary(x => x.Id);
        return decimal.Round(lines.Sum(x => byId.GetValueOrDefault(x.OrderLineId)?.UnitPrice * x.Qty * merchandiseRate ?? 0), 2);
    }
}
