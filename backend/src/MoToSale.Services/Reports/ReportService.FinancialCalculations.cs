using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Reports;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Payments;
using MoToSale.Repository;

namespace MoToSale.Services.Reports;
public partial class ReportService
{
    private async Task<decimal> CalculateRefundsInRangeAsync(DateTime? start, DateTime? end)
    {
        var refundsQuery = _db.Refunds
            .AsNoTracking()
            .Where(refund => refund.RefundStatus == "Paid");

        if (start.HasValue)
        {
            refundsQuery = refundsQuery.Where(refund => refund.RefundedAt >= start.Value);
        }

        if (end.HasValue)
        {
            refundsQuery = refundsQuery.Where(refund => refund.RefundedAt <= end.Value);
        }

        decimal? total = await refundsQuery.SumAsync(refund => (decimal?)refund.Amount);
        return total ?? 0m;
    }

    private async Task<decimal> CalculateReturnedCogsAsync(DateTime? start, DateTime? end, IReadOnlyDictionary<int, decimal> costMap)
    {
        var returnLinesQuery =
            from line in _db.SalesReturnLines.AsNoTracking()
            join salesReturn in _db.SalesReturns.AsNoTracking() on line.SalesReturnId equals salesReturn.Id
            where salesReturn.ReturnStatus == "Approved" && line.ItemCondition == "Resellable"
            select new { salesReturn.ApprovedAt, line.SkuId, line.Qty };

        if (start.HasValue)
        {
            returnLinesQuery = returnLinesQuery.Where(row => row.ApprovedAt >= start.Value);
        }

        if (end.HasValue)
        {
            returnLinesQuery = returnLinesQuery.Where(row => row.ApprovedAt <= end.Value);
        }

        var returnedRows = await returnLinesQuery.ToListAsync();
        return returnedRows.Sum(row => costMap.GetValueOrDefault(row.SkuId) * row.Qty);
    }

    private static RecentOrderDto MapRecentOrder(Order order)
    {
        return new RecentOrderDto(
            order.Id,
            order.Code,
            order.UserId,
            order.ShippingRecipient,
            order.GrandTotal,
            order.OrderStatus,
            order.PaymentStatus,
            order.FulfillmentStatus,
            order.PlacedAt ?? order.CreatedDate);
    }

    private static bool IsInRange(DateTime? value, DateTime? start, DateTime? end)
    {
        if (!value.HasValue)
        {
            return false;
        }

        if (start.HasValue && value.Value < start.Value)
        {
            return false;
        }

        if (end.HasValue && value.Value > end.Value)
        {
            return false;
        }

        return true;
    }

    private static DateTime GetOrderRevenueDate(Order order)
    {
        return order.PlacedAt ?? order.UpdatedDate ?? order.CreatedDate;
    }

    private static bool IsRevenueOrder(Order order)
    {
        bool isPaid = order.PaymentStatus == PaymentStatus.Paid;
        bool isDelivered = order.OrderStatus == OrderStatus.Delivered;

        return isPaid && isDelivered;
    }
}
