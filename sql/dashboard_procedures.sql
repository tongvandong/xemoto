/*
    Dashboard stored procedures for SQL Server.

    Muc dich:
    - Dung de doi chieu nhanh so lieu dashboard voi logic trong ReportService.
    - Mac dinh tinh theo 7 ngay gan nhat theo gio kinh doanh Viet Nam (UTC+7).

    Cach chay:
    1. Chon dung database MoToSale trong SSMS.
    2. Chay toan bo file nay de tao/cap nhat procedure.
    3. Chay cac lenh EXEC o cuoi file.
*/

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardSummary
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TodayBusinessDate date = CONVERT(date, DATEADD(hour, 7, GETUTCDATE()));
    DECLARE @StartUtc datetime2 = DATEADD(hour, -7, DATEADD(day, -6, CAST(@TodayBusinessDate AS datetime2)));
    DECLARE @EndUtc datetime2 = DATEADD(nanosecond, -100, DATEADD(hour, -7, DATEADD(day, 1, CAST(@TodayBusinessDate AS datetime2))));

    ;WITH RangeOrders AS
    (
        SELECT *
        FROM dbo.Orders
        WHERE ISNULL(PlacedAt, CreatedDate) BETWEEN @StartUtc AND @EndUtc
    ),
    RevenueOrders AS
    (
        SELECT *
        FROM dbo.Orders
        WHERE PaymentStatus = 'Paid'
          AND OrderStatus = 'Delivered'
          AND ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @StartUtc AND @EndUtc
    ),
    AvgCost AS
    (
        SELECT SkuId, SUM(UnitCost * Qty) / NULLIF(SUM(Qty), 0) AS AvgUnitCost
        FROM dbo.GoodsReceiptLines
        GROUP BY SkuId

        UNION ALL

        SELECT pol.SkuId, SUM(pol.UnitCost * pol.OrderedQty) / NULLIF(SUM(pol.OrderedQty), 0) AS AvgUnitCost
        FROM dbo.PurchaseOrderLines pol
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM dbo.GoodsReceiptLines grl
            WHERE grl.SkuId = pol.SkuId
        )
        GROUP BY pol.SkuId
    ),
    RevenueCost AS
    (
        SELECT SUM(ISNULL(ac.AvgUnitCost, 0) * ol.Qty) AS GrossCogs
        FROM RevenueOrders ro
        INNER JOIN dbo.OrderLines ol ON ol.OrderId = ro.Id
        LEFT JOIN AvgCost ac ON ac.SkuId = ol.SkuId
    ),
    ReturnCost AS
    (
        SELECT SUM(ISNULL(ac.AvgUnitCost, 0) * srl.Qty) AS ReturnedCogs
        FROM dbo.SalesReturnLines srl
        INNER JOIN dbo.SalesReturns sr ON sr.Id = srl.SalesReturnId
        LEFT JOIN AvgCost ac ON ac.SkuId = srl.SkuId
        WHERE sr.ReturnStatus = 'Approved'
          AND srl.ItemCondition = 'Resellable'
          AND sr.ApprovedAt BETWEEN @StartUtc AND @EndUtc
    ),
    Refunds AS
    (
        SELECT SUM(Amount) AS RefundTotal
        FROM dbo.Refunds
        WHERE RefundStatus = 'Paid'
          AND RefundedAt BETWEEN @StartUtc AND @EndUtc
    ),
    GrossRevenue AS
    (
        SELECT SUM(GrandTotal) AS GrossRevenue
        FROM RevenueOrders
    )
    SELECT
        ProductCount = (SELECT COUNT(*) FROM dbo.Products),
        OrderCount = (SELECT COUNT(*) FROM RangeOrders),
        RevenueOrderCount = (SELECT COUNT(*) FROM RevenueOrders),
        UserCount = (SELECT COUNT(*) FROM dbo.Users),
        GrossRevenue = ISNULL((SELECT GrossRevenue FROM GrossRevenue), 0),
        RefundTotal = ISNULL((SELECT RefundTotal FROM Refunds), 0),
        MonthRevenue = CASE
            WHEN ISNULL((SELECT GrossRevenue FROM GrossRevenue), 0) - ISNULL((SELECT RefundTotal FROM Refunds), 0) < 0 THEN 0
            ELSE ISNULL((SELECT GrossRevenue FROM GrossRevenue), 0) - ISNULL((SELECT RefundTotal FROM Refunds), 0)
        END,
        Cogs = CASE
            WHEN ISNULL((SELECT GrossCogs FROM RevenueCost), 0) - ISNULL((SELECT ReturnedCogs FROM ReturnCost), 0) < 0 THEN 0
            ELSE ISNULL((SELECT GrossCogs FROM RevenueCost), 0) - ISNULL((SELECT ReturnedCogs FROM ReturnCost), 0)
        END,
        GrossProfit =
            CASE
                WHEN ISNULL((SELECT GrossRevenue FROM GrossRevenue), 0) - ISNULL((SELECT RefundTotal FROM Refunds), 0) < 0 THEN 0
                ELSE ISNULL((SELECT GrossRevenue FROM GrossRevenue), 0) - ISNULL((SELECT RefundTotal FROM Refunds), 0)
            END
            -
            CASE
                WHEN ISNULL((SELECT GrossCogs FROM RevenueCost), 0) - ISNULL((SELECT ReturnedCogs FROM ReturnCost), 0) < 0 THEN 0
                ELSE ISNULL((SELECT GrossCogs FROM RevenueCost), 0) - ISNULL((SELECT ReturnedCogs FROM ReturnCost), 0)
            END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardRevenue7Days
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TodayBusinessDate date = CONVERT(date, DATEADD(hour, 7, GETUTCDATE()));
    DECLARE @StartBusinessDate date = DATEADD(day, -6, @TodayBusinessDate);
    DECLARE @StartUtc datetime2 = DATEADD(hour, -7, CAST(@StartBusinessDate AS datetime2));
    DECLARE @EndUtc datetime2 = DATEADD(nanosecond, -100, DATEADD(hour, -7, DATEADD(day, 1, CAST(@TodayBusinessDate AS datetime2))));

    ;WITH Days AS
    (
        SELECT 0 AS DayIndex, @StartBusinessDate AS BusinessDate
        UNION ALL
        SELECT DayIndex + 1, DATEADD(day, 1, BusinessDate)
        FROM Days
        WHERE DayIndex < 6
    ),
    RevenueByDay AS
    (
        SELECT
            BusinessDate = CONVERT(date, DATEADD(hour, 7, ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)))),
            Revenue = SUM(GrandTotal)
        FROM dbo.Orders
        WHERE PaymentStatus = 'Paid'
          AND OrderStatus = 'Delivered'
          AND ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @StartUtc AND @EndUtc
        GROUP BY CONVERT(date, DATEADD(hour, 7, ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate))))
    ),
    RefundByDay AS
    (
        SELECT
            BusinessDate = CONVERT(date, DATEADD(hour, 7, RefundedAt)),
            RefundTotal = SUM(Amount)
        FROM dbo.Refunds
        WHERE RefundStatus = 'Paid'
          AND RefundedAt BETWEEN @StartUtc AND @EndUtc
        GROUP BY CONVERT(date, DATEADD(hour, 7, RefundedAt))
    )
    SELECT
        [Key] = CONVERT(varchar(10), d.BusinessDate, 23),
        [Label] = FORMAT(d.BusinessDate, 'dd/MM'),
        [Value] = CASE
            WHEN ISNULL(r.Revenue, 0) - ISNULL(f.RefundTotal, 0) < 0 THEN 0
            ELSE ISNULL(r.Revenue, 0) - ISNULL(f.RefundTotal, 0)
        END
    FROM Days d
    LEFT JOIN RevenueByDay r ON r.BusinessDate = d.BusinessDate
    LEFT JOIN RefundByDay f ON f.BusinessDate = d.BusinessDate
    ORDER BY d.BusinessDate
    OPTION (MAXRECURSION 7);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardOrderStatus
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TodayBusinessDate date = CONVERT(date, DATEADD(hour, 7, GETUTCDATE()));
    DECLARE @StartUtc datetime2 = DATEADD(hour, -7, DATEADD(day, -6, CAST(@TodayBusinessDate AS datetime2)));
    DECLARE @EndUtc datetime2 = DATEADD(nanosecond, -100, DATEADD(hour, -7, DATEADD(day, 1, CAST(@TodayBusinessDate AS datetime2))));

    SELECT
        [Label] = CASE OrderStatus
            WHEN 'Pending' THEN N'Chờ xác nhận'
            WHEN 'Preparing' THEN N'Đang chuẩn bị hàng'
            WHEN 'Shipping' THEN N'Đang giao'
            WHEN 'Delivered' THEN N'Đã giao'
            WHEN 'Cancelled' THEN N'Đã hủy'
            ELSE N'Khác'
        END,
        [Value] = COUNT(*)
    FROM dbo.Orders
    WHERE ISNULL(PlacedAt, CreatedDate) BETWEEN @StartUtc AND @EndUtc
    GROUP BY CASE OrderStatus
            WHEN 'Pending' THEN N'Chờ xác nhận'
            WHEN 'Preparing' THEN N'Đang chuẩn bị hàng'
            WHEN 'Shipping' THEN N'Đang giao'
            WHEN 'Delivered' THEN N'Đã giao'
            WHEN 'Cancelled' THEN N'Đã hủy'
            ELSE N'Khác'
        END
    ORDER BY [Label];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardTopProducts
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TodayBusinessDate date = CONVERT(date, DATEADD(hour, 7, GETUTCDATE()));
    DECLARE @StartUtc datetime2 = DATEADD(hour, -7, DATEADD(day, -6, CAST(@TodayBusinessDate AS datetime2)));
    DECLARE @EndUtc datetime2 = DATEADD(nanosecond, -100, DATEADD(hour, -7, DATEADD(day, 1, CAST(@TodayBusinessDate AS datetime2))));

    ;WITH RevenueOrders AS
    (
        SELECT *
        FROM dbo.Orders
        WHERE PaymentStatus = 'Paid'
          AND OrderStatus = 'Delivered'
          AND ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @StartUtc AND @EndUtc
    ),
    AvgCost AS
    (
        SELECT SkuId, SUM(UnitCost * Qty) / NULLIF(SUM(Qty), 0) AS AvgUnitCost
        FROM dbo.GoodsReceiptLines
        GROUP BY SkuId

        UNION ALL

        SELECT pol.SkuId, SUM(pol.UnitCost * pol.OrderedQty) / NULLIF(SUM(pol.OrderedQty), 0) AS AvgUnitCost
        FROM dbo.PurchaseOrderLines pol
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM dbo.GoodsReceiptLines grl
            WHERE grl.SkuId = pol.SkuId
        )
        GROUP BY pol.SkuId
    )
    SELECT TOP (5)
        Id = ol.SkuId,
        [Name] = ol.ProductNameSnapshot,
        Sold = SUM(ol.Qty),
        Revenue = SUM(ol.LineTotal),
        Cost = SUM(ISNULL(ac.AvgUnitCost, 0) * ol.Qty),
        Profit = SUM(ol.LineTotal) - SUM(ISNULL(ac.AvgUnitCost, 0) * ol.Qty)
    FROM RevenueOrders ro
    INNER JOIN dbo.OrderLines ol ON ol.OrderId = ro.Id
    LEFT JOIN AvgCost ac ON ac.SkuId = ol.SkuId
    GROUP BY ol.SkuId, ol.ProductNameSnapshot
    ORDER BY SUM(ol.Qty) DESC, SUM(ol.LineTotal) DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardOperations
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TodayBusinessDate date = CONVERT(date, DATEADD(hour, 7, GETUTCDATE()));
    DECLARE @TodayStartUtc datetime2 = DATEADD(hour, -7, CAST(@TodayBusinessDate AS datetime2));
    DECLARE @TodayEndUtc datetime2 = DATEADD(nanosecond, -100, DATEADD(hour, -7, DATEADD(day, 1, CAST(@TodayBusinessDate AS datetime2))));
    DECLARE @MonthStartBusinessDate date = DATEFROMPARTS(YEAR(@TodayBusinessDate), MONTH(@TodayBusinessDate), 1);
    DECLARE @MonthStartUtc datetime2 = DATEADD(hour, -7, CAST(@MonthStartBusinessDate AS datetime2));

    ;WITH PaidPayments AS
    (
        SELECT Amount
        FROM dbo.Payments
        WHERE PaymentRecordStatus = 'Paid'
    ),
    PaidRefunds AS
    (
        SELECT Amount, RefundedAt
        FROM dbo.Refunds
        WHERE RefundStatus = 'Paid'
    ),
    RevenueOrders AS
    (
        SELECT *
        FROM dbo.Orders
        WHERE PaymentStatus = 'Paid'
          AND OrderStatus = 'Delivered'
    )
    SELECT
        TodayRevenue = CASE
            WHEN
                ISNULL((SELECT SUM(GrandTotal) FROM RevenueOrders WHERE ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @TodayStartUtc AND @TodayEndUtc), 0)
                - ISNULL((SELECT SUM(Amount) FROM PaidRefunds WHERE RefundedAt BETWEEN @TodayStartUtc AND @TodayEndUtc), 0) < 0
            THEN 0
            ELSE
                ISNULL((SELECT SUM(GrandTotal) FROM RevenueOrders WHERE ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @TodayStartUtc AND @TodayEndUtc), 0)
                - ISNULL((SELECT SUM(Amount) FROM PaidRefunds WHERE RefundedAt BETWEEN @TodayStartUtc AND @TodayEndUtc), 0)
        END,
        MonthRevenue = CASE
            WHEN
                ISNULL((SELECT SUM(GrandTotal) FROM RevenueOrders WHERE ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @MonthStartUtc AND @TodayEndUtc), 0)
                - ISNULL((SELECT SUM(Amount) FROM PaidRefunds WHERE RefundedAt BETWEEN @MonthStartUtc AND @TodayEndUtc), 0) < 0
            THEN 0
            ELSE
                ISNULL((SELECT SUM(GrandTotal) FROM RevenueOrders WHERE ISNULL(PlacedAt, ISNULL(UpdatedDate, CreatedDate)) BETWEEN @MonthStartUtc AND @TodayEndUtc), 0)
                - ISNULL((SELECT SUM(Amount) FROM PaidRefunds WHERE RefundedAt BETWEEN @MonthStartUtc AND @TodayEndUtc), 0)
        END,
        PaidTotal = ISNULL((SELECT SUM(Amount) FROM PaidPayments), 0),
        RefundedTotal = ISNULL((SELECT SUM(Amount) FROM PaidRefunds), 0),
        CustomerReceivable = ISNULL((
            SELECT SUM(CASE WHEN RemainingAmount > 0 THEN RemainingAmount ELSE 0 END)
            FROM dbo.Orders
            WHERE OrderStatus <> 'Cancelled'
              AND OrderType <> 'Installment'
              AND PaymentStatus <> 'Paid'
              AND PaymentStatus <> 'Refunded'
        ), 0),
        SupplierPayable = ISNULL((
            SELECT SUM(TotalAmount - PaidAmount)
            FROM dbo.PurchaseOrders
            WHERE PurchaseStatus <> 'Cancelled'
        ), 0),
        PendingOrders = (SELECT COUNT(*) FROM dbo.Orders WHERE OrderStatus = 'Pending'),
        ShippingOrders = (SELECT COUNT(*) FROM dbo.Orders WHERE OrderStatus IN ('Preparing', 'Shipping')),
        PendingPurchases = (SELECT COUNT(*) FROM dbo.PurchaseOrders WHERE PurchaseStatus IN ('Draft', 'Approved', 'PartiallyReceived')),
        OpenRepairs = (SELECT COUNT(*) FROM dbo.RepairOrders WHERE RepairStatus NOT IN ('Delivered', 'Cancelled')),
        OpenWarranties = (SELECT COUNT(*) FROM dbo.Warranties WHERE WarrantyStatus NOT IN ('Completed', 'Rejected', 'Cancelled')),
        OpenCrmTasks = (SELECT COUNT(*) FROM dbo.CustomerInteractions WHERE InteractionStatus = 'Open'),
        OutOfStock = (SELECT COUNT(*) FROM dbo.InventoryItems WHERE OnHand - Reserved <= 0),
        LowStock = (SELECT COUNT(*) FROM dbo.InventoryItems WHERE OnHand - Reserved > 0 AND OnHand - Reserved <= ReorderPoint),
        UnpaidOrders = (
            SELECT COUNT(*)
            FROM dbo.Orders
            WHERE OrderStatus <> 'Cancelled'
              AND OrderType <> 'Installment'
              AND PaymentStatus = 'Unpaid'
              AND RemainingAmount > 0
        ),
        PendingPaymentOrders = (
            SELECT COUNT(*)
            FROM dbo.Orders
            WHERE PaymentStatus = 'PendingConfirmation'
              AND OrderStatus <> 'Cancelled'
        ),
        NewContacts = (SELECT COUNT(*) FROM dbo.ContactRequests WHERE ContactStatus = 'New');
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DashboardInventoryWarnings
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (10)
        SkuId = item.SkuId,
        SkuCode = sku.SkuCode,
        ProductName = product.Name,
        OnHand = item.OnHand,
        Reserved = item.Reserved,
        Available = item.OnHand - item.Reserved,
        ReorderPoint = item.ReorderPoint,
        WarningStatus = CASE
            WHEN item.OnHand - item.Reserved < 0 THEN N'Thiếu hàng đã giữ chỗ'
            WHEN item.OnHand - item.Reserved = 0 THEN N'Hết hàng'
            ELSE N'Sắp hết hàng'
        END
    FROM dbo.InventoryItems item
    INNER JOIN dbo.Skus sku ON sku.Id = item.SkuId
    INNER JOIN dbo.Products product ON product.Id = sku.ProductId
    WHERE item.OnHand - item.Reserved <= 0
       OR (item.OnHand - item.Reserved > 0 AND item.OnHand - item.Reserved <= item.ReorderPoint)
    ORDER BY item.OnHand - item.Reserved, product.Name;
END;
GO

/*
    Lenh chay thu:
*/
EXEC dbo.sp_DashboardSummary;
EXEC dbo.sp_DashboardRevenue7Days;
EXEC dbo.sp_DashboardOrderStatus;
EXEC dbo.sp_DashboardTopProducts;
EXEC dbo.sp_DashboardOperations;
EXEC dbo.sp_DashboardInventoryWarnings;
GO
