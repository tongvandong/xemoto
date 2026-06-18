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
    private async Task<DashboardOperationsDto> BuildDashboardOperationsAsync(List<Order> orders)
    {
        DateTime today = GetBusinessToday();
        DateTime todayStart = GetBusinessDayStartUtc(today);
        DateTime todayEnd = GetBusinessDayEndUtc(today);
        DateTime monthStart = GetBusinessDayStartUtc(new DateTime(today.Year, today.Month, 1));
        DateTime monthEnd = GetBusinessDayEndUtc(today);

        var paid = await _db.Payments.AsNoTracking()
            .Where(payment => payment.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .ToListAsync();

        var refunded = await _db.Refunds.AsNoTracking()
            .Where(refund => refund.RefundStatus == "Paid")
            .ToListAsync();

        decimal paidTotal = paid.Sum(payment => payment.Amount);
        decimal refundedTotal = refunded.Sum(refund => refund.Amount);
        decimal outstandingCustomer = CalculateCustomerReceivable(orders);
        decimal supplierDebt = await CalculateSupplierDebtAsync();

        return new DashboardOperationsDto(
            TodayRevenue: CalculateNetRevenue(orders, refunded, todayStart, todayEnd),
            MonthRevenue: CalculateNetRevenue(orders, refunded, monthStart, monthEnd),
            PaidTotal: paidTotal,
            RefundedTotal: refundedTotal,
            CustomerReceivable: outstandingCustomer,
            SupplierPayable: supplierDebt,
            PendingOrders: orders.Count(order => order.OrderStatus == OrderStatus.Pending),
            ShippingOrders: orders.Count(order => order.OrderStatus == OrderStatus.Preparing || order.OrderStatus == OrderStatus.Shipping),
            PendingPurchases: await _db.PurchaseOrders.CountAsync(order => order.PurchaseStatus == "Draft" || order.PurchaseStatus == "Approved" || order.PurchaseStatus == "PartiallyReceived"),
            OpenRepairs: await _db.RepairOrders.CountAsync(repair => repair.RepairStatus != "Delivered" && repair.RepairStatus != "Cancelled"),
            OpenWarranties: await _db.Warranties.CountAsync(warranty => warranty.WarrantyStatus != "Completed" && warranty.WarrantyStatus != "Rejected" && warranty.WarrantyStatus != "Cancelled"),
            OpenCrmTasks: await _db.CustomerInteractions.CountAsync(task => task.InteractionStatus == "Open"),
            OutOfStock: await _db.InventoryItems.CountAsync(item => item.OnHand - item.Reserved <= 0),
            LowStock: await _db.InventoryItems.CountAsync(item => item.OnHand - item.Reserved > 0 && item.OnHand - item.Reserved <= item.ReorderPoint),
            UnpaidOrders: orders.Count(IsUnpaidActiveOrder),
            PendingPaymentOrders: orders.Count(order => order.PaymentStatus == PaymentStatus.PendingConfirmation && order.OrderStatus != OrderStatus.Cancelled),
            NewContacts: await _db.ContactRequests.CountAsync(contact => contact.ContactStatus == "New"));
    }

    private static decimal CalculateCustomerReceivable(IEnumerable<Order> orders)
    {
        return orders
            .Where(order => order.OrderStatus != OrderStatus.Cancelled)
            .Where(order => order.OrderType != OrderType.Installment)
            .Where(order => order.PaymentStatus != PaymentStatus.Paid)
            .Where(order => order.PaymentStatus != PaymentStatus.Refunded)
            .Sum(order => Math.Max(0, order.RemainingAmount));
    }

    private static decimal CalculateNetRevenue(IEnumerable<Order> orders, IEnumerable<Refund> refunds, DateTime start, DateTime end)
    {
        decimal grossRevenue = orders
            .Where(IsRevenueOrder)
            .Where(order => IsInRange(GetOrderRevenueDate(order), start, end))
            .Sum(order => order.GrandTotal);

        decimal refundTotal = refunds
            .Where(refund => IsInRange(refund.RefundedAt, start, end))
            .Sum(refund => refund.Amount);

        return Math.Max(0, grossRevenue - refundTotal);
    }

    private static bool IsUnpaidActiveOrder(Order order)
    {
        if (order.OrderStatus == OrderStatus.Cancelled)
        {
            return false;
        }

        if (order.OrderType == OrderType.Installment)
        {
            return false;
        }

        if (order.PaymentStatus != PaymentStatus.Unpaid)
        {
            return false;
        }

        return order.RemainingAmount > 0;
    }

    private async Task<decimal> CalculateSupplierDebtAsync()
    {
        decimal? supplierDebt = await _db.PurchaseOrders.AsNoTracking()
            .Where(order => order.PurchaseStatus != "Cancelled")
            .SumAsync(order => (decimal?)(order.TotalAmount - order.PaidAmount));

        return supplierDebt ?? 0m;
    }

    private async Task<List<InventoryWarningDto>> BuildInventoryWarningsAsync(int limit)
    {
        return await (from item in _db.InventoryItems.AsNoTracking()
                      join sku in _db.Skus.AsNoTracking() on item.SkuId equals sku.Id
                      join product in _db.Products.AsNoTracking() on sku.ProductId equals product.Id
                      let available = item.OnHand - item.Reserved
                      where available <= 0 || (available > 0 && available <= item.ReorderPoint)
                      orderby available, product.Name
                      select new InventoryWarningDto(
                          item.SkuId,
                          sku.SkuCode,
                          product.Name,
                          item.OnHand,
                          item.Reserved,
                          available,
                          item.ReorderPoint,
                          available < 0 ? "Thiếu hàng đã giữ chỗ" : available == 0 ? "Hết hàng" : "Sắp hết hàng"))
            .Take(limit)
            .ToListAsync();
    }

    private async Task<List<PurchaseReportDto>> BuildPurchaseReportAsync(DateTime? start, DateTime? end)
    {
        var query = _db.PurchaseOrders.AsNoTracking().Include(order => order.Supplier).AsQueryable();

        if (start.HasValue)
        {
            query = query.Where(order => order.CreatedDate >= start.Value);
        }

        if (end.HasValue)
        {
            query = query.Where(order => order.CreatedDate <= end.Value);
        }

        return await query
            .OrderByDescending(order => order.CreatedDate)
            .Select(order => new PurchaseReportDto(
                order.Id,
                order.Code,
                order.Supplier.Name,
                order.PurchaseStatus,
                order.TotalAmount,
                order.PaidAmount,
                order.TotalAmount - order.PaidAmount,
                order.CreatedDate))
            .ToListAsync();
    }

    private async Task<List<CashReportDto>> BuildCashReportAsync(DateTime? start, DateTime? end)
    {
        var query = _db.CashTransactions.AsNoTracking().AsQueryable();

        if (start.HasValue)
        {
            query = query.Where(cash => cash.OccurredAt >= start.Value);
        }

        if (end.HasValue)
        {
            query = query.Where(cash => cash.OccurredAt <= end.Value);
        }

        return await query
            .OrderByDescending(cash => cash.OccurredAt)
            .Select(cash => new CashReportDto(
                cash.Id,
                cash.Code,
                cash.TransactionType,
                cash.Category,
                cash.Amount,
                cash.Method,
                cash.ReferenceType,
                cash.ReferenceId,
                cash.OccurredAt,
                cash.Note))
            .ToListAsync();
    }
}
