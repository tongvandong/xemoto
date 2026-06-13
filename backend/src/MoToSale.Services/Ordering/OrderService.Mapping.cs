using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.EFCore;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Ordering;
public partial class OrderService
{
    // Nạp ProductId của các SKU trong đơn bằng MỘT truy vấn (tránh N+1 khi đơn nhiều dòng).
    private async Task<Dictionary<int, int>> SkuProductMapAsync(IEnumerable<int> skuIds)
    {
        var ids = skuIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        var skus = await _skus.FindAsync(sku => ids.Contains(sku.Id));
        return skus.ToDictionary(sku => sku.Id, sku => sku.ProductId);
    }

    private async Task<OrderDetail> MapDetailAsync(Order o)
    {
        var productIdBySku = await SkuProductMapAsync(o.Lines.Select(l => l.SkuId));
        var lines = new List<OrderLineDto>();
        foreach (var l in o.Lines)
        {
            var allocs = new List<AllocationDto>();
            foreach (var a in l.Allocations)
                allocs.Add(new AllocationDto(a.Id, a.Qty, a.AllocationStatus));
            lines.Add(new OrderLineDto(l.Id, productIdBySku.GetValueOrDefault(l.SkuId), l.SkuId, l.ProductNameSnapshot, l.SkuCodeSnapshot, l.UnitPrice, l.Qty, l.LineTotal, allocs));
        }

        var names = await UserNameMapAsync(new[] { o.UserId });
        var histories = await _orders.GetHistoriesAsync(o.Id);
        var payments = await _payments.GetByOrderAsync(o.Id);
        return new OrderDetail(
            o.Id, o.Code, o.UserId, o.OrderType, o.OrderStatus, o.PaymentMethod, o.PaymentStatus, o.FulfillmentStatus,
            o.Subtotal, o.DiscountTotal, o.ShippingFee, o.GrandTotal, o.DepositAmount, o.RemainingAmount,
            o.ShippingRecipient, o.ShippingPhone, o.ShippingEmail, o.ShippingAddress, o.ReceivingMethod,
            o.Note, o.FulfillmentNote, o.PickupAppointmentAt, o.PlacedAt, names.GetValueOrDefault(o.UserId), lines,
            histories.Select(x => new OrderHistoryDto(
                x.Id,
                ResolveHistoryEventType(x.FromStatus, x.ToStatus, x.Note),
                x.FromStatus, x.ToStatus, x.Note, x.ChangedBy, x.CreatedDate)),
            payments.Select(x => new OrderPaymentDto(x.Id, x.Code, x.PaymentType, x.Amount, x.Method, x.PaymentRecordStatus, x.TransactionRef, x.PaidAt)));
    }

    private static string ResolveHistoryEventType(string? fromStatus, string toStatus, string? note)
    {
        if (note?.StartsWith("FulfillmentStatus", StringComparison.Ordinal) == true) return "ShippingStatus";
        if (note?.StartsWith("PaymentStatus", StringComparison.Ordinal) == true) return "PaymentStatus";

        var values = new[] { fromStatus, toStatus }
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToHashSet(StringComparer.Ordinal);

        if (values.Overlaps(new[]
        {
            PaymentStatus.Unpaid,
            PaymentStatus.PendingConfirmation,
            PaymentStatus.Paid,
            PaymentStatus.Refunded,
            PaymentStatus.Failed,
        })) return "PaymentStatus";

        if (values.Overlaps(new[]
        {
            FulfillmentStatus.Unallocated,
            FulfillmentStatus.Allocated,
            FulfillmentStatus.Shipped,
            FulfillmentStatus.Fulfilled,
        })) return "ShippingStatus";

        return "OrderStatus";
    }

    // Dòng tóm tắt cho danh sách đơn; ProductId tra qua SKU bằng một truy vấn (tránh N+1).
    private async Task<List<OrderLineSummaryDto>> MapLineSummariesAsync(Order order)
    {
        var productIdBySku = await SkuProductMapAsync(order.Lines.Select(l => l.SkuId));
        return order.Lines
            .Select(x => new OrderLineSummaryDto(x.SkuId, x.ProductNameSnapshot, x.SkuCodeSnapshot, x.UnitPrice, x.Qty, x.LineTotal, productIdBySku.GetValueOrDefault(x.SkuId)))
            .ToList();
    }
}
