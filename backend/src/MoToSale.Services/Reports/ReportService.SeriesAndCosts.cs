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
    private static List<RevenuePointDto> BuildRevenueSeries(IEnumerable<Order> orders, DateTime? start, DateTime? end)
    {
        DateTime from = start.HasValue ? ToBusinessDate(start.Value) : GetBusinessToday().AddDays(-6);
        DateTime to = end.HasValue ? ToBusinessDate(end.Value) : GetBusinessToday();
        int days = Math.Clamp((int)(to - from).TotalDays + 1, 1, 62);

        Dictionary<string, RevenuePointDto> buckets = Enumerable.Range(0, days)
            .Select(index => from.AddDays(index))
            .ToDictionary(
                date => date.ToString("yyyy-MM-dd"),
                date => new RevenuePointDto(date.ToString("yyyy-MM-dd"), date.ToString("dd/MM"), 0));

        foreach (Order order in orders)
        {
            string key = ToBusinessDate(GetOrderRevenueDate(order)).ToString("yyyy-MM-dd");

            if (buckets.TryGetValue(key, out RevenuePointDto? bucket))
            {
                buckets[key] = bucket with { Value = bucket.Value + order.GrandTotal };
            }
        }

        return buckets.Values.ToList();
    }

    private static List<OrderStatusPointDto> BuildOrderStatusSeries(IEnumerable<Order> orders)
    {
        return orders
            .GroupBy(order => NormalizeStatusGroup(order.OrderStatus))
            .Select(group => new OrderStatusPointDto(group.Key, group.Count()))
            .OrderBy(point => point.Label)
            .ToList();
    }

    private static string NormalizeStatusGroup(string status)
    {
        switch (status)
        {
            case OrderStatus.Pending:
                return "Chờ xác nhận";
            case OrderStatus.Preparing:
                return "Đang chuẩn bị hàng";
            case OrderStatus.Shipping:
                return "Đang giao";
            case OrderStatus.Delivered:
                return "Đã giao";
            case OrderStatus.Cancelled:
                return "Đã hủy";
            default:
                return "Khác";
        }
    }

    private static List<TopProductDto> BuildTopProducts(IEnumerable<Order> revenueOrders, int limit, IReadOnlyDictionary<int, decimal> costMap)
    {
        return revenueOrders
            .SelectMany(order => order.Lines)
            .GroupBy(line => new { line.SkuId, line.ProductNameSnapshot })
            .Select(group =>
            {
                decimal revenue = group.Sum(line => line.LineTotal);
                int sold = group.Sum(line => line.Qty);
                decimal cost = costMap.GetValueOrDefault(group.Key.SkuId) * sold;

                return new TopProductDto(group.Key.SkuId, group.Key.ProductNameSnapshot, sold, revenue, cost, revenue - cost);
            })
            .OrderByDescending(item => item.Sold)
            .ThenByDescending(item => item.Revenue)
            .Take(limit)
            .ToList();
    }

    private async Task<Dictionary<int, decimal>> BuildAvgCostMapAsync()
    {
        var fromReceipts = await _db.GoodsReceiptLines
            .AsNoTracking()
            .GroupBy(line => line.SkuId)
            .Select(group => new
            {
                SkuId = group.Key,
                Qty = group.Sum(line => line.Qty),
                Cost = group.Sum(line => line.UnitCost * line.Qty)
            })
            .ToListAsync();

        Dictionary<int, decimal> map = fromReceipts
            .Where(row => row.Qty > 0)
            .ToDictionary(row => row.SkuId, row => row.Cost / row.Qty);

        var fromPurchases = await _db.PurchaseOrderLines
            .AsNoTracking()
            .GroupBy(line => line.SkuId)
            .Select(group => new
            {
                SkuId = group.Key,
                Qty = group.Sum(line => line.OrderedQty),
                Cost = group.Sum(line => line.UnitCost * line.OrderedQty)
            })
            .ToListAsync();

        foreach (var row in fromPurchases.Where(row => row.Qty > 0 && !map.ContainsKey(row.SkuId)))
        {
            map[row.SkuId] = row.Cost / row.Qty;
        }

        return map;
    }
}
