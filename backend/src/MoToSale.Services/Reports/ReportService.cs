using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Reports;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Payments;
using MoToSale.Repository;

namespace MoToSale.Services.Reports;

public partial class ReportService : IReportService
{
    private const int BusinessUtcOffsetHours = 7;
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ReportResponse> GetSummaryAsync()
    {
        return await BuildReportAsync(null, null, 5);
    }

    public async Task<ReportResponse> GetDashboardAsync()
    {
        DateTime today = GetBusinessToday();
        DateTime start = GetBusinessDayStartUtc(today.AddDays(-6));
        DateTime end = GetBusinessDayEndUtc(today);

        return await BuildReportAsync(start, end, 5);
    }

    public async Task<ReportResponse> GetReportAsync(DateTime? startDate, DateTime? endDate, int top)
    {
        DateTime start = GetReportStartDate(startDate);
        DateTime end = GetReportEndDate(endDate);

        if (end < start)
        {
            throw new ReportException("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
        }

        int safeTop = Math.Clamp(top, 1, 50);

        return await BuildReportAsync(start, end, safeTop);
    }

    private async Task<ReportResponse> BuildReportAsync(DateTime? start, DateTime? end, int topLimit)
    {
        var products = await _db.Products.AsNoTracking().ToListAsync();
        int usersTotal = await _db.Users.AsNoTracking().CountAsync();
        DateTime now = DateTime.UtcNow;

        List<Order> allOrders = await _db.Orders
            .AsNoTracking()
            .Include(order => order.Lines)
            .ToListAsync();

        List<Order> rangeOrders = allOrders
            .Where(order => IsInRange(order.PlacedAt ?? order.CreatedDate, start, end))
            .ToList();

        List<Order> revenueOrders = allOrders
            .Where(IsRevenueOrder)
            .Where(order => IsInRange(order.PlacedAt ?? order.UpdatedDate ?? order.CreatedDate, start, end))
            .ToList();

        decimal grossRevenue = revenueOrders.Sum(order => order.GrandTotal);
        Dictionary<int, decimal> costMap = await BuildAvgCostMapAsync();
        decimal grossCogs = revenueOrders
            .SelectMany(order => order.Lines)
            .Sum(line => costMap.GetValueOrDefault(line.SkuId) * line.Qty);

        decimal refundsInRange = await CalculateRefundsInRangeAsync(start, end);
        decimal returnedCogs = await CalculateReturnedCogsAsync(start, end, costMap);

        decimal revenue = Math.Max(0, grossRevenue - refundsInRange);
        decimal cogs = Math.Max(0, grossCogs - returnedCogs);
        decimal grossProfit = revenue - cogs;

        List<RecentOrderDto> recentOrders = allOrders
            .OrderByDescending(order => order.PlacedAt ?? order.CreatedDate)
            .Take(5)
            .Select(MapRecentOrder)
            .ToList();

        List<RecentOrderDto> rangeOrderDtos = rangeOrders
            .OrderByDescending(order => order.PlacedAt ?? order.CreatedDate)
            .Select(MapRecentOrder)
            .ToList();

        return new ReportResponse(
            new ReportStatsDto(products.Count, rangeOrders.Count, revenue, revenueOrders.Count, usersTotal, cogs, grossProfit),
            BuildRevenueSeries(revenueOrders, start, end),
            BuildOrderStatusSeries(rangeOrders),
            BuildTopProducts(revenueOrders, topLimit, costMap),
            recentOrders,
            rangeOrderDtos,
            await BuildDashboardOperationsAsync(allOrders),
            await BuildInventoryWarningsAsync(10),
            await BuildPurchaseReportAsync(start, end),
            await BuildCashReportAsync(start, end),
            await BuildServiceReportAsync(start, end),
            await BuildReceivableReportAsync(),
            await BuildCrmTasksAsync(now));
    }

    private static DateTime GetBusinessToday()
    {
        return DateTime.UtcNow.AddHours(BusinessUtcOffsetHours).Date;
    }

    private static DateTime GetBusinessDayStartUtc(DateTime businessDate)
    {
        return businessDate.Date.AddHours(-BusinessUtcOffsetHours);
    }

    private static DateTime GetBusinessDayEndUtc(DateTime businessDate)
    {
        return businessDate.Date.AddDays(1).AddHours(-BusinessUtcOffsetHours).AddTicks(-1);
    }

    private static DateTime ToBusinessDate(DateTime value)
    {
        return value.AddHours(BusinessUtcOffsetHours).Date;
    }
}
