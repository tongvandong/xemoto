using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Repository;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary() => Ok(await BuildReportAsync(null, null, 5));

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard() => Ok(await BuildReportAsync(DateTime.UtcNow.Date.AddDays(-6), DateTime.UtcNow.Date.AddDays(1).AddTicks(-1), 5));

    [HttpGet]
    public async Task<IActionResult> Report([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] int top = 10)
    {
        var start = (startDate ?? DateTime.UtcNow.Date.AddDays(-29)).Date;
        var end = (endDate ?? DateTime.UtcNow.Date).Date.AddDays(1).AddTicks(-1);
        if (end < start) return BadRequest(new { message = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu." });

        return Ok(await BuildReportAsync(start, end, Math.Clamp(top, 1, 50)));
    }

    private async Task<ReportResponse> BuildReportAsync(DateTime? start, DateTime? end, int topLimit)
    {
        var products = await _db.Products.AsNoTracking().ToListAsync();
        var usersTotal = await _db.Users.AsNoTracking().CountAsync();
        var now = DateTime.UtcNow;

        var allOrders = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Lines)
            .ToListAsync();

        var rangeOrders = allOrders
            .Where(o => IsInRange(o.PlacedAt ?? o.CreatedDate, start, end))
            .ToList();

        var revenueOrders = allOrders
            .Where(IsRevenueOrder)
            .Where(o => IsInRange(o.PlacedAt ?? o.UpdatedDate ?? o.CreatedDate, start, end))
            .ToList();

        var grossRevenue = revenueOrders.Sum(o => o.GrandTotal);
        var costMap = await BuildAvgCostMapAsync();
        var grossCogs = revenueOrders.SelectMany(o => o.Lines).Sum(l => costMap.GetValueOrDefault(l.SkuId) * l.Qty);

        // Net hóa: trừ tiền đã hoàn cho khách (đổi trả) trong kỳ + bớt giá vốn hàng trả "bán lại được" (đã nhập kho lại).
        var refundsQuery = _db.Refunds.AsNoTracking().Where(x => x.RefundStatus == "Paid");
        if (start.HasValue) refundsQuery = refundsQuery.Where(x => x.RefundedAt >= start.Value);
        if (end.HasValue) refundsQuery = refundsQuery.Where(x => x.RefundedAt <= end.Value);
        var refundsInRange = await refundsQuery.SumAsync(x => (decimal?)x.Amount) ?? 0;

        var returnLinesQuery = from l in _db.SalesReturnLines.AsNoTracking()
                               join r in _db.SalesReturns.AsNoTracking() on l.SalesReturnId equals r.Id
                               where r.ReturnStatus == "Approved" && l.ItemCondition == "Resellable"
                               select new { r.ApprovedAt, l.SkuId, l.Qty };
        if (start.HasValue) returnLinesQuery = returnLinesQuery.Where(x => x.ApprovedAt >= start.Value);
        if (end.HasValue) returnLinesQuery = returnLinesQuery.Where(x => x.ApprovedAt <= end.Value);
        var returnedResellable = await returnLinesQuery.ToListAsync();
        var returnedCogs = returnedResellable.Sum(x => costMap.GetValueOrDefault(x.SkuId) * x.Qty);

        var revenue = Math.Max(0, grossRevenue - refundsInRange);   // doanh thu thuần
        var cogs = Math.Max(0, grossCogs - returnedCogs);
        var grossProfit = revenue - cogs;
        var recentOrders = allOrders
            .OrderByDescending(o => o.PlacedAt ?? o.CreatedDate)
            .Take(5)
            .Select(o => new RecentOrderDto(o.Id, o.Code, o.UserId, o.ShippingRecipient, o.GrandTotal, o.OrderStatus, o.PaymentStatus, o.FulfillmentStatus, o.PlacedAt ?? o.CreatedDate))
            .ToList();

        var rangeOrderDtos = rangeOrders
            .OrderByDescending(o => o.PlacedAt ?? o.CreatedDate)
            .Select(o => new RecentOrderDto(o.Id, o.Code, o.UserId, o.ShippingRecipient, o.GrandTotal, o.OrderStatus, o.PaymentStatus, o.FulfillmentStatus, o.PlacedAt ?? o.CreatedDate))
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

    private static bool IsInRange(DateTime? value, DateTime? start, DateTime? end)
    {
        if (!value.HasValue) return false;
        if (start.HasValue && value.Value < start.Value) return false;
        if (end.HasValue && value.Value > end.Value) return false;
        return true;
    }

    private static bool IsRevenueOrder(Entities.Ordering.Order order) =>
        order.PaymentStatus == PaymentStatus.Paid &&
        order.OrderStatus == OrderStatus.Delivered;

    private static List<RevenuePointDto> BuildRevenueSeries(IEnumerable<Entities.Ordering.Order> orders, DateTime? start, DateTime? end)
    {
        var from = (start ?? DateTime.UtcNow.Date.AddDays(-6)).Date;
        var to = (end ?? DateTime.UtcNow.Date).Date;
        var days = Math.Clamp((int)(to - from).TotalDays + 1, 1, 62);
        var buckets = Enumerable.Range(0, days)
            .Select(i => from.AddDays(i))
            .ToDictionary(d => d.ToString("yyyy-MM-dd"), d => new RevenuePointDto(d.ToString("yyyy-MM-dd"), d.ToString("dd/MM"), 0));

        foreach (var order in orders)
        {
            var key = (order.PlacedAt ?? order.UpdatedDate ?? order.CreatedDate).Date.ToString("yyyy-MM-dd");
            if (buckets.TryGetValue(key, out var bucket))
            {
                buckets[key] = bucket with { Value = bucket.Value + order.GrandTotal };
            }
        }

        return buckets.Values.ToList();
    }

    private static List<OrderStatusPointDto> BuildOrderStatusSeries(IEnumerable<Entities.Ordering.Order> orders) =>
        orders
            .GroupBy(o => NormalizeStatusGroup(o.OrderStatus))
            .Select(g => new OrderStatusPointDto(g.Key, g.Count()))
            .OrderBy(x => x.Label)
            .ToList();

    private static string NormalizeStatusGroup(string status) => status switch
    {
        OrderStatus.Pending => "Chờ xác nhận",
        OrderStatus.Shipping => "Đang giao",
        OrderStatus.Delivered => "Đã giao",
        OrderStatus.Cancelled => "Đã hủy",
        _ => "Khác",
    };

    private static List<TopProductDto> BuildTopProducts(IEnumerable<Entities.Ordering.Order> revenueOrders, int limit, IReadOnlyDictionary<int, decimal> costMap) =>
        revenueOrders
            .SelectMany(o => o.Lines)
            .GroupBy(l => new { l.SkuId, l.ProductNameSnapshot })
            .Select(g =>
            {
                var revenue = g.Sum(l => l.LineTotal);
                var cost = costMap.GetValueOrDefault(g.Key.SkuId) * g.Sum(l => l.Qty);
                return new TopProductDto(g.Key.SkuId, g.Key.ProductNameSnapshot, g.Sum(l => l.Qty), revenue, cost, revenue - cost);
            })
            .OrderByDescending(x => x.Sold)
            .ThenByDescending(x => x.Revenue)
            .Take(limit)
            .ToList();

    /// <summary>Giá vốn bình quân theo SKU = tổng (Qty*UnitCost) / tổng Qty từ phiếu nhập; thiếu thì lấy theo đơn mua.</summary>
    private async Task<Dictionary<int, decimal>> BuildAvgCostMapAsync()
    {
        var fromReceipts = await _db.GoodsReceiptLines.AsNoTracking()
            .GroupBy(x => x.SkuId)
            .Select(g => new { SkuId = g.Key, Qty = g.Sum(x => x.Qty), Cost = g.Sum(x => x.UnitCost * x.Qty) })
            .ToListAsync();
        var map = fromReceipts.Where(x => x.Qty > 0).ToDictionary(x => x.SkuId, x => x.Cost / x.Qty);

        var fromPurchases = await _db.PurchaseOrderLines.AsNoTracking()
            .GroupBy(x => x.SkuId)
            .Select(g => new { SkuId = g.Key, Qty = g.Sum(x => x.OrderedQty), Cost = g.Sum(x => x.UnitCost * x.OrderedQty) })
            .ToListAsync();
        foreach (var row in fromPurchases.Where(x => x.Qty > 0 && !map.ContainsKey(x.SkuId)))
            map[row.SkuId] = row.Cost / row.Qty;

        return map;
    }

    private async Task<DashboardOperationsDto> BuildDashboardOperationsAsync(List<Entities.Ordering.Order> orders)
    {
        var today = DateTime.UtcNow.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var paid = await _db.Payments.AsNoTracking()
            .Where(x => x.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .ToListAsync();
        var refunded = await _db.Refunds.AsNoTracking()
            .Where(x => x.RefundStatus == "Paid")
            .ToListAsync();

        var paidTotal = paid.Sum(x => x.Amount);
        var refundedTotal = refunded.Sum(x => x.Amount);
        var outstandingCustomer = orders.Sum(x => Math.Max(0, x.GrandTotal - (paid.Where(p => p.OrderId == x.Id).Sum(p => p.Amount) - refunded.Where(r => r.OrderId == x.Id).Sum(r => r.Amount))));
        var supplierDebt = await _db.PurchaseOrders.AsNoTracking()
            .Where(x => x.PurchaseStatus != "Cancelled")
            .SumAsync(x => (decimal?)(x.TotalAmount - x.PaidAmount)) ?? 0;

        return new DashboardOperationsDto(
            TodayRevenue: orders.Where(IsRevenueOrder).Where(x => (x.PlacedAt ?? x.UpdatedDate ?? x.CreatedDate).Date == today).Sum(x => x.GrandTotal),
            MonthRevenue: orders.Where(IsRevenueOrder).Where(x => (x.PlacedAt ?? x.UpdatedDate ?? x.CreatedDate) >= monthStart).Sum(x => x.GrandTotal),
            PaidTotal: paidTotal,
            RefundedTotal: refundedTotal,
            CustomerReceivable: outstandingCustomer,
            SupplierPayable: supplierDebt,
            PendingOrders: orders.Count(x => x.OrderStatus == OrderStatus.Pending),
            ShippingOrders: orders.Count(x => x.OrderStatus == OrderStatus.Shipping),
            PendingPurchases: await _db.PurchaseOrders.CountAsync(x => x.PurchaseStatus == "Draft" || x.PurchaseStatus == "Approved" || x.PurchaseStatus == "PartiallyReceived"),
            OpenRepairs: await _db.RepairOrders.CountAsync(x => x.RepairStatus != "Delivered" && x.RepairStatus != "Cancelled"),
            OpenWarranties: await _db.Warranties.CountAsync(x => x.WarrantyStatus != "Completed" && x.WarrantyStatus != "Rejected" && x.WarrantyStatus != "Cancelled"),
            OpenCrmTasks: await _db.CustomerInteractions.CountAsync(x => x.InteractionStatus == "Open"),
            OutOfStock: await _db.InventoryItems.CountAsync(x => x.OnHand - x.Reserved <= 0),
            LowStock: await _db.InventoryItems.CountAsync(x => x.OnHand - x.Reserved > 0 && x.OnHand - x.Reserved <= x.ReorderPoint));
    }

    private async Task<List<InventoryWarningDto>> BuildInventoryWarningsAsync(int limit) =>
        await (from i in _db.InventoryItems.AsNoTracking()
               join s in _db.Skus.AsNoTracking() on i.SkuId equals s.Id
               join p in _db.Products.AsNoTracking() on s.ProductId equals p.Id
               let available = i.OnHand - i.Reserved
               where available <= 0 || (available > 0 && available <= i.ReorderPoint)
               orderby available, p.Name
               select new InventoryWarningDto(i.SkuId, s.SkuCode, p.Name, i.OnHand, i.Reserved, available, i.ReorderPoint,
                   available < 0 ? "Thiếu hàng đã giữ chỗ" : available == 0 ? "Hết hàng" : "Sắp hết hàng"))
            .Take(limit)
            .ToListAsync();

    private async Task<List<PurchaseReportDto>> BuildPurchaseReportAsync(DateTime? start, DateTime? end)
    {
        var query = _db.PurchaseOrders.AsNoTracking().Include(x => x.Supplier).AsQueryable();
        if (start.HasValue) query = query.Where(x => x.CreatedDate >= start.Value);
        if (end.HasValue) query = query.Where(x => x.CreatedDate <= end.Value);
        return await query.OrderByDescending(x => x.CreatedDate)
            .Select(x => new PurchaseReportDto(x.Id, x.Code, x.Supplier.Name, x.PurchaseStatus, x.TotalAmount, x.PaidAmount, x.TotalAmount - x.PaidAmount, x.CreatedDate))
            .ToListAsync();
    }

    private async Task<List<CashReportDto>> BuildCashReportAsync(DateTime? start, DateTime? end)
    {
        var query = _db.CashTransactions.AsNoTracking().AsQueryable();
        if (start.HasValue) query = query.Where(x => x.OccurredAt >= start.Value);
        if (end.HasValue) query = query.Where(x => x.OccurredAt <= end.Value);
        return await query.OrderByDescending(x => x.OccurredAt)
            .Select(x => new CashReportDto(x.Id, x.Code, x.TransactionType, x.Category, x.Amount, x.Method, x.ReferenceType, x.ReferenceId, x.OccurredAt, x.Note))
            .ToListAsync();
    }

    private async Task<ServiceReportDto> BuildServiceReportAsync(DateTime? start, DateTime? end)
    {
        var repairs = _db.RepairOrders.AsNoTracking().AsQueryable();
        var warranties = _db.Warranties.AsNoTracking().AsQueryable();
        if (start.HasValue)
        {
            repairs = repairs.Where(x => x.CreatedDate >= start.Value);
            warranties = warranties.Where(x => x.CreatedDate >= start.Value);
        }
        if (end.HasValue)
        {
            repairs = repairs.Where(x => x.CreatedDate <= end.Value);
            warranties = warranties.Where(x => x.CreatedDate <= end.Value);
        }
        var repairRows = await repairs.OrderByDescending(x => x.CreatedDate)
            .Select(x => new RepairReportDto(x.Id, x.Code, x.VehicleDescription, x.ReportedIssue, x.RepairStatus, x.LaborCost + x.PartsCost, x.ReceivedAt, x.CompletedAt))
            .ToListAsync();
        var warrantyRows = await warranties.OrderByDescending(x => x.CreatedDate)
            .Select(x => new WarrantyReportDto(x.Id, x.Code, x.ProductSnapshot, x.CustomerName, x.WarrantyStatus, x.StartAt, x.StartAt.AddMonths(x.Months), x.CreatedDate))
            .ToListAsync();
        return new ServiceReportDto(repairRows, warrantyRows);
    }

    private async Task<List<ReceivableReportDto>> BuildReceivableReportAsync()
    {
        var orders = await _db.Orders.AsNoTracking().OrderByDescending(x => x.Id).ToListAsync();
        var users = await _db.Users.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.FullName);
        var paid = await _db.Payments.AsNoTracking().Where(x => x.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .GroupBy(x => x.OrderId).Select(x => new { OrderId = x.Key, Amount = x.Sum(v => v.Amount) }).ToDictionaryAsync(x => x.OrderId, x => x.Amount);
        var refunded = await _db.Refunds.AsNoTracking().Where(x => x.RefundStatus == "Paid")
            .GroupBy(x => x.OrderId).Select(x => new { OrderId = x.Key, Amount = x.Sum(v => v.Amount) }).ToDictionaryAsync(x => x.OrderId, x => x.Amount);
        return orders.Select(x =>
        {
            var totalPaid = paid.GetValueOrDefault(x.Id);
            var totalRefunded = refunded.GetValueOrDefault(x.Id);
            var netPaid = totalPaid - totalRefunded;
            return new ReceivableReportDto(x.Id, x.Code, users.GetValueOrDefault(x.UserId) ?? x.ShippingRecipient, x.GrandTotal, totalPaid, totalRefunded, Math.Max(0, x.GrandTotal - netPaid), x.PaymentStatus);
        }).Where(x => x.Outstanding > 0).ToList();
    }

    private async Task<List<CrmTaskDto>> BuildCrmTasksAsync(DateTime now) =>
        await (from x in _db.CustomerInteractions.AsNoTracking()
               join c in _db.Users.AsNoTracking() on x.CustomerId equals c.Id
               join staff in _db.Users.AsNoTracking() on x.AssignedStaffId equals staff.Id into staffRows
               from staff in staffRows.DefaultIfEmpty()
               where x.InteractionStatus == "Open"
               orderby x.FollowUpAt ?? x.CreatedDate
               select new CrmTaskDto(x.Id, x.CustomerId, c.FullName, staff == null ? null : staff.FullName, x.InteractionType, x.Subject, x.FollowUpAt, x.FollowUpAt.HasValue && x.FollowUpAt.Value < now))
            .Take(20)
            .ToListAsync();
}

public record ReportResponse(
    ReportStatsDto Stats,
    IReadOnlyList<RevenuePointDto> RevenueSeries,
    IReadOnlyList<OrderStatusPointDto> OrderStatusSeries,
    IReadOnlyList<TopProductDto> TopProducts,
    IReadOnlyList<RecentOrderDto> RecentOrders,
    IReadOnlyList<RecentOrderDto> Orders,
    DashboardOperationsDto Operations,
    IReadOnlyList<InventoryWarningDto> InventoryWarnings,
    IReadOnlyList<PurchaseReportDto> PurchaseReports,
    IReadOnlyList<CashReportDto> CashReports,
    ServiceReportDto ServiceReports,
    IReadOnlyList<ReceivableReportDto> ReceivableReports,
    IReadOnlyList<CrmTaskDto> CrmTasks);

public record ReportStatsDto(int ProductCount, int OrderCount, decimal MonthRevenue, int RevenueOrderCount, int UserCount, decimal Cogs, decimal GrossProfit);
public record RevenuePointDto(string Key, string Label, decimal Value);
public record OrderStatusPointDto(string Label, int Value);
public record TopProductDto(int Id, string Name, int Sold, decimal Revenue, decimal Cost, decimal Profit);
public record RecentOrderDto(int Id, string Code, int UserId, string? CustomerName, decimal GrandTotal, string OrderStatus, string PaymentStatus, string FulfillmentStatus, DateTime CreatedAt);
public record DashboardOperationsDto(decimal TodayRevenue, decimal MonthRevenue, decimal PaidTotal, decimal RefundedTotal, decimal CustomerReceivable, decimal SupplierPayable, int PendingOrders, int ShippingOrders, int PendingPurchases, int OpenRepairs, int OpenWarranties, int OpenCrmTasks, int OutOfStock, int LowStock);
public record InventoryWarningDto(int SkuId, string SkuCode, string ProductName, int OnHand, int Reserved, int Available, int ReorderPoint, string WarningStatus);
public record PurchaseReportDto(int Id, string Code, string SupplierName, string Status, decimal TotalAmount, decimal PaidAmount, decimal Outstanding, DateTime CreatedDate);
public record CashReportDto(int Id, string Code, string TransactionType, string Category, decimal Amount, string Method, string? ReferenceType, int? ReferenceId, DateTime OccurredAt, string? Note);
public record ServiceReportDto(IReadOnlyList<RepairReportDto> Repairs, IReadOnlyList<WarrantyReportDto> Warranties);
public record RepairReportDto(int Id, string Code, string VehicleDescription, string ReportedIssue, string Status, decimal Total, DateTime ReceivedAt, DateTime? CompletedAt);
public record WarrantyReportDto(int Id, string Code, string ProductSnapshot, string? CustomerName, string Status, DateTime StartAt, DateTime EndAt, DateTime CreatedDate);
public record ReceivableReportDto(int OrderId, string OrderCode, string CustomerName, decimal GrandTotal, decimal PaidAmount, decimal RefundedAmount, decimal Outstanding, string PaymentStatus);
public record CrmTaskDto(int Id, int CustomerId, string CustomerName, string? StaffName, string InteractionType, string Subject, DateTime? FollowUpAt, bool IsOverdue);
