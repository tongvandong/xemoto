using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;

namespace MoToSale.Services.Operations;

public partial class AdvancedOperationsService
{
    public async Task ApproveReturnAsync(int id, ApproveSalesReturnRequest r, int? userId)
    {
        await using var transaction = await BeginSerializableTransactionAsync();
        var row = await _db.SalesReturns.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new AdvancedOperationsException("Không tìm thấy phiếu trả hàng.");
        if (row.ReturnStatus != "Draft") throw new AdvancedOperationsException("Chỉ phiếu chờ duyệt mới được duyệt.");
        var order = await _db.Orders.Include(x => x.Lines).FirstAsync(x => x.Id == row.OrderId);
        foreach (var line in row.Lines)
        {
            var returned = await _db.SalesReturnLines
                .Where(x => x.OrderLineId == line.OrderLineId && x.SalesReturnId != row.Id && x.SalesReturn.ReturnStatus == "Approved")
                .SumAsync(x => (int?)x.Qty) ?? 0;
            var sold = order.Lines.First(x => x.Id == line.OrderLineId).Qty;
            if (returned + line.Qty > sold)
                throw new AdvancedOperationsException("Sản phẩm đã được trả ở phiếu khác. Vui lòng kiểm tra lại phiếu.");
        }
        var maxRefund = CalculateRefundableAmount(order, row.Lines.Select(x => (x.OrderLineId, x.Qty)));
        // Không hoàn quá số tiền khách đã THỰC TRẢ (trừ phần đã hoàn trước đó) — tránh chi quỹ cho tiền chưa thu.
        var paidForOrder = await _db.Payments
            .Where(p => p.OrderId == order.Id && p.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;
        var refundedForOrder = await _db.Refunds
            .Where(x => x.OrderId == order.Id)
            .SumAsync(x => (decimal?)x.Amount) ?? 0;
        var refundCeiling = Math.Min(maxRefund, Math.Max(0, paidForOrder - refundedForOrder));
        if (r.RefundAmount < 0 || r.RefundAmount > refundCeiling)
            throw new AdvancedOperationsException($"Số tiền hoàn không hợp lệ. Tối đa {refundCeiling:n0} đ (đã thu {paidForOrder:n0} đ, đã hoàn {refundedForOrder:n0} đ).");
        var now = DateTime.UtcNow;
        foreach (var line in row.Lines.Where(x => x.ItemCondition == "Resellable"))
        {
            var item = await _db.InventoryItems.FirstOrDefaultAsync(x => x.SkuId == line.SkuId);
            if (item is null)
            {
                item = new InventoryItem { SkuId = line.SkuId, CreatedDate = now };
                _db.InventoryItems.Add(item);
            }
            item.OnHand += line.Qty;
            item.UpdatedDate = now;
            _db.StockMovements.Add(new StockMovement
            {
                SkuId = line.SkuId, Type = (int)StockMovementType.Receipt,
                QtyDelta = line.Qty, BalanceAfter = item.OnHand, RefType = "SalesReturn", RefId = row.Id,
                Reason = $"Approved return {row.Code}", PerformedBy = userId, OccurredAt = now, CreatedDate = now,
            });
        }
        row.ReturnStatus = "Approved";
        row.RefundAmount = r.RefundAmount;
        row.Note = string.IsNullOrWhiteSpace(r.Note) ? row.Note : r.Note;
        row.ApprovedBy = userId;
        row.ApprovedAt = now;
        row.UpdatedDate = now;
        if (r.RefundAmount > 0)
        {
            var refundMethod = string.IsNullOrWhiteSpace(r.RefundMethod) ? "Cash" : r.RefundMethod;
            _db.Refunds.Add(new Refund
            {
                Code = $"RF{now:yyyyMMddHHmmssfff}", OrderId = row.OrderId, SalesReturnId = row.Id,
                Amount = r.RefundAmount, Method = refundMethod,
                Reason = row.Reason, TransactionRef = r.TransactionRef, RecordedBy = userId,
                RefundedAt = now, CreatedDate = now,
            });

            // Ghi chi quỹ: dòng tiền ra cho khoản hoàn tiền (đồng bộ sổ quỹ với phiếu hoàn).
            _db.CashTransactions.Add(new CashTransaction
            {
                Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Payment", Category = "Refund",
                Amount = r.RefundAmount, Method = refundMethod, ReferenceType = "SalesReturn", ReferenceId = row.Id,
                Note = $"Hoàn tiền trả hàng {row.Code}", RecordedBy = userId, OccurredAt = now, CreatedDate = now,
            });
        }
        await _db.SaveChangesAsync();
        if (transaction is not null) await transaction.CommitAsync();
    }

    public async Task RejectReturnAsync(int id, string? note, int? userId)
    {
        var row = await _db.SalesReturns.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new AdvancedOperationsException("Không tìm thấy phiếu trả hàng.");
        if (row.ReturnStatus != "Draft") throw new AdvancedOperationsException("Chỉ phiếu chờ duyệt mới được từ chối.");
        row.ReturnStatus = "Rejected";
        row.Note = note;
        row.ApprovedBy = userId;
        row.ApprovedAt = DateTime.UtcNow;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
