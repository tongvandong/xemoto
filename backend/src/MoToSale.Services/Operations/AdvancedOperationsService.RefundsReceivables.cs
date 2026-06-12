using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Operations;

namespace MoToSale.Services.Operations;

public partial class AdvancedOperationsService
{
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
}
