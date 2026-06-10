using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public class AdvancedOperationsService : IAdvancedOperationsService
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
                ItemCondition = line.ItemCondition is "Damaged" or "Warranty" ? line.ItemCondition : "Resellable",
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
            ?? throw new AdvancedOperationsException("Sales return not found.");
        if (row.ReturnStatus != "Draft") throw new AdvancedOperationsException("Only draft returns can be rejected.");
        row.ReturnStatus = "Rejected";
        row.Note = note;
        row.ApprovedBy = userId;
        row.ApprovedAt = DateTime.UtcNow;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<List<RefundDto>> GetRefundsAsync(int? orderId)
    {
        var q = _db.Refunds.AsNoTracking().AsQueryable();
        if (orderId.HasValue) q = q.Where(x => x.OrderId == orderId);
        return await (from x in q
                      join o in _db.Orders.AsNoTracking() on x.OrderId equals o.Id
                      orderby x.Id descending
                      select new RefundDto(x.Id, x.Code, x.OrderId, o.Code, x.SalesReturnId, x.Amount, x.Method, x.RefundStatus, x.Reason, x.TransactionRef, x.RefundedAt))
            .ToListAsync();
    }

    public async Task<List<OrderReceivableDto>> GetReceivablesAsync()
    {
        var orders = await _db.Orders.AsNoTracking().Include(x => x.Lines).OrderByDescending(x => x.Id).ToListAsync();
        var users = await _db.Users.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.FullName);
        var paid = await _db.Payments.AsNoTracking().Where(x => x.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .GroupBy(x => x.OrderId).Select(x => new { OrderId = x.Key, Amount = x.Sum(v => v.Amount) }).ToDictionaryAsync(x => x.OrderId, x => x.Amount);
        var refunded = await _db.Refunds.AsNoTracking().Where(x => x.RefundStatus == "Paid")
            .GroupBy(x => x.OrderId).Select(x => new { OrderId = x.Key, Amount = x.Sum(v => v.Amount) }).ToDictionaryAsync(x => x.OrderId, x => x.Amount);
        var approvedReturns = await _db.SalesReturns.AsNoTracking().Include(x => x.Lines)
            .Where(x => x.ReturnStatus == "Approved").ToListAsync();
        return orders.Select(x =>
        {
            var totalPaid = paid.GetValueOrDefault(x.Id);
            var totalRefunded = refunded.GetValueOrDefault(x.Id);
            var net = totalPaid - totalRefunded;
            var returnedValue = approvedReturns.Where(r => r.OrderId == x.Id)
                .Sum(r => CalculateRefundableAmount(x, r.Lines.Select(l => (l.OrderLineId, l.Qty))));
            var adjustedTotal = Math.Max(0, x.GrandTotal - returnedValue);
            return new OrderReceivableDto(x.Id, x.Code, users.GetValueOrDefault(x.UserId) ?? x.ShippingRecipient, x.GrandTotal, adjustedTotal, x.DepositAmount, totalPaid, totalRefunded, net, Math.Max(0, adjustedTotal - net), x.PaymentStatus);
        }).ToList();
    }

    public async Task<List<StaffShiftDto>> GetShiftsAsync(DateTime? from, DateTime? to, int? staffUserId)
    {
        var q = _db.StaffShifts.AsNoTracking().AsQueryable();
        if (from.HasValue) q = q.Where(x => x.EndsAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.StartsAt <= to.Value);
        if (staffUserId.HasValue) q = q.Where(x => x.StaffUserId == staffUserId.Value);
        return await (from x in q
                      join u in _db.Users.AsNoTracking() on x.StaffUserId equals u.Id
                      orderby x.StartsAt
                      select new StaffShiftDto(x.Id, x.StaffUserId, u.FullName, x.StartsAt, x.EndsAt, x.ShiftStatus, x.Note))
            .ToListAsync();
    }

    public async Task<int> CreateShiftAsync(CreateStaffShiftRequest r, int? userId)
    {
        ValidateShift(r.StartsAt, r.EndsAt);
        if (!await IsStaffAsync(r.StaffUserId)) throw new AdvancedOperationsException("Chỉ tài khoản nhân viên mới được phân ca.");
        if (await HasOverlapAsync(r.StaffUserId, r.StartsAt, r.EndsAt, null)) throw new AdvancedOperationsException("Ca làm việc bị trùng thời gian với ca đã có.");
        var row = new StaffShift { StaffUserId = r.StaffUserId, StartsAt = r.StartsAt, EndsAt = r.EndsAt, Note = r.Note, AssignedBy = userId, CreatedDate = DateTime.UtcNow };
        _db.StaffShifts.Add(row);
        await _db.SaveChangesAsync();
        return row.Id;
    }

    public async Task UpdateShiftAsync(int id, UpdateStaffShiftRequest r)
    {
        ValidateShift(r.StartsAt, r.EndsAt);
        var row = await _db.StaffShifts.FindAsync(id) ?? throw new AdvancedOperationsException("Không tìm thấy ca làm việc.");
        if (await HasOverlapAsync(row.StaffUserId, r.StartsAt, r.EndsAt, id)) throw new AdvancedOperationsException("Ca làm việc bị trùng thời gian với ca đã có.");
        row.StartsAt = r.StartsAt; row.EndsAt = r.EndsAt;
        row.ShiftStatus = r.ShiftStatus is "Completed" or "Cancelled" ? r.ShiftStatus : "Scheduled";
        row.Note = r.Note; row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteShiftAsync(int id)
    {
        var row = await _db.StaffShifts.FindAsync(id) ?? throw new AdvancedOperationsException("Không tìm thấy ca làm việc.");
        row.ShiftStatus = "Cancelled";
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
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
                ItemCondition = line.ItemCondition is "Damaged" or "Warranty" ? line.ItemCondition : "Resellable",
                CreatedDate = now,
            });
        }
        return lines;
    }

    private Task<bool> HasOverlapAsync(int staffId, DateTime startsAt, DateTime endsAt, int? exceptId) =>
        _db.StaffShifts.AnyAsync(x => x.StaffUserId == staffId && (!exceptId.HasValue || x.Id != exceptId) && x.ShiftStatus != "Cancelled" && startsAt < x.EndsAt && endsAt > x.StartsAt);

    private static void ValidateShift(DateTime startsAt, DateTime endsAt)
    {
        if (startsAt >= endsAt) throw new AdvancedOperationsException("Giờ bắt đầu phải trước giờ kết thúc.");
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

    private Task<bool> IsStaffAsync(int userId) =>
        _db.UserRoles.AnyAsync(x => x.UserId == userId && x.Role.Code == "Staff");

    private async Task<IDbContextTransaction?> BeginSerializableTransactionAsync() =>
        _db.Database.IsRelational() ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;

    private static decimal CalculateRefundableAmount(Entities.Ordering.Order order, IEnumerable<(int OrderLineId, int Qty)> lines)
    {
        if (order.Subtotal <= 0) return 0;
        var merchandiseRate = Math.Max(0, order.Subtotal - order.DiscountTotal) / order.Subtotal;
        var byId = order.Lines.ToDictionary(x => x.Id);
        return decimal.Round(lines.Sum(x => byId.GetValueOrDefault(x.OrderLineId)?.UnitPrice * x.Qty * merchandiseRate ?? 0), 2);
    }
}
