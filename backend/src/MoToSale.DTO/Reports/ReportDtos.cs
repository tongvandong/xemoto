namespace MoToSale.DTO.Reports;

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
