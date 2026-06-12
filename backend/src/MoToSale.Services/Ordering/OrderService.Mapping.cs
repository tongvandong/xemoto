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
    private async Task<OrderDetail> MapDetailAsync(Order o)
    {
        var lines = new List<OrderLineDto>();
        foreach (var l in o.Lines)
        {
            var allocs = new List<AllocationDto>();
            foreach (var a in l.Allocations)
                allocs.Add(new AllocationDto(a.Id, a.Qty, a.AllocationStatus));
            var sku = await _skus.GetByIdAsync(l.SkuId);
            lines.Add(new OrderLineDto(l.Id, sku?.ProductId ?? 0, l.SkuId, l.ProductNameSnapshot, l.SkuCodeSnapshot, l.UnitPrice, l.Qty, l.LineTotal, allocs));
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

    private static IEnumerable<OrderLineSummaryDto> MapLineSummaries(Order order) =>
        order.Lines.Select(x => new OrderLineSummaryDto(x.SkuId, x.ProductNameSnapshot, x.SkuCodeSnapshot, x.UnitPrice, x.Qty, x.LineTotal));
}
