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
    public async Task<List<OrderListItem>> GetMyOrdersAsync(int userId)
    {
        var orders = await _orders.GetByUserAsync(userId);
        return orders.Select(o => new OrderListItem(o.Id, o.Code, o.OrderStatus, o.PaymentStatus, o.FulfillmentStatus, o.GrandTotal, o.PlacedAt, o.UserId, null, MapLineSummaries(o))).ToList();
    }

    public async Task<OrderDetail?> GetOrderAsync(int id)
    {
        var o = await _orders.GetDetailAsync(id);
        return o is null ? null : await MapDetailAsync(o);
    }

    public async Task<PagingResponse<OrderListItem>> SearchOrdersAsync(OrderSearchRequest request)
    {
        var page = await _orders.SearchAsync(request);
        var names = await UserNameMapAsync(page.Items.Select(o => o.UserId));
        return new PagingResponse<OrderListItem>
        {
            Items = page.Items.Select(o => new OrderListItem(o.Id, o.Code, o.OrderStatus, o.PaymentStatus, o.FulfillmentStatus, o.GrandTotal, o.PlacedAt, o.UserId, names.GetValueOrDefault(o.UserId), MapLineSummaries(o))).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        };
    }

    // ===== Allocation =====
    public async Task<List<AllocationSuggestionItem>> GetAllocationSuggestionAsync(int orderId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        var result = new List<AllocationSuggestionItem>();
        foreach (var line in order.Lines)
        {
            var available = await _inventory.GetTotalAvailableAsync(line.SkuId);
            result.Add(new AllocationSuggestionItem(line.Id, line.SkuId, line.ProductNameSnapshot, line.Qty, available));
        }
        return result;
    }

    public async Task AllocateAsync(int orderId, AllocateRequest req, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new OrderException("Đơn đã hủy.");
        if (order.OrderStatus == OrderStatus.Delivered || order.FulfillmentStatus == FulfillmentStatus.Fulfilled)
            throw new OrderException("Đơn đã giao, không thể soạn/xuất kho lại.");
        if (req.Allocations is null || req.Allocations.Count == 0) throw new OrderException("Chưa có dòng xuất kho.");

        // Mỗi dòng phải được xuất kho đủ số lượng.
        foreach (var line in order.Lines)
        {
            var allocated = req.Allocations.Where(a => a.OrderLineId == line.Id).Sum(a => a.Qty);
            if (allocated != line.Qty)
                throw new OrderException($"Dòng #{line.Id} cần xuất đủ {line.Qty} (đang {allocated}).");
        }

        var now = DateTime.UtcNow;
        foreach (var a in req.Allocations)
        {
            if (a.Qty <= 0) continue;
            var line = order.Lines.First(l => l.Id == a.OrderLineId);
            var item = await _inventory.GetOrCreateItemAsync(line.SkuId);
            if (item.OnHand < a.Qty)
                throw new OrderException($"Tồn kho không đủ cho SKU #{line.SkuId}.");

            item.OnHand -= a.Qty;
            item.UpdatedDate = now;
            _inventory.AddMovement(new StockMovement
            {
                SkuId = line.SkuId, Type = (int)StockMovementType.Issue,
                QtyDelta = -a.Qty, BalanceAfter = item.OnHand, RefType = "Order", RefId = orderId,
                Reason = $"Xuất kho đơn {order.Code}", PerformedBy = userId, OccurredAt = now, CreatedDate = now,
            });

            line.Allocations.Add(new Allocation { OrderLineId = line.Id, Qty = a.Qty, AllocationStatus = AllocationStatus.Planned, CreatedDate = now });
        }

        // Nhả giữ chỗ (đã chuyển thành xuất kho thực tế).
        foreach (var r in await _reservations.GetByOrderAsync(orderId))
        {
            if (r.ReservationStatus is ReservationStatus.Active or ReservationStatus.Confirmed)
            {
                r.ReservationStatus = ReservationStatus.Released;
                r.UpdatedDate = now;
                var relItem = await _inventory.GetItemAsync(r.SkuId);
                if (relItem is not null) { relItem.Reserved = Math.Max(0, relItem.Reserved - r.Qty); relItem.UpdatedDate = now; }
            }
        }

        var from = order.OrderStatus;
        order.FulfillmentStatus = FulfillmentStatus.Shipped;
        order.OrderStatus = OrderStatus.Shipping;
        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = from, ToStatus = OrderStatus.Shipping, Note = "Soạn hàng & xuất kho", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();
    }

    // ===== Giao hàng & xuất kho (chốt đơn giữ chỗ / đơn cọc) =====
    public async Task FulfillAsync(int orderId, int? userId)
        => await _unitOfWork.ExecuteInTransactionAsync(() => FulfillCoreAsync(orderId, userId));

    private async Task FulfillCoreAsync(int orderId, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new OrderException("Đơn đã hủy.");
        if (order.FulfillmentStatus == FulfillmentStatus.Fulfilled) throw new OrderException("Đơn đã giao/xuất kho.");

        var now = DateTime.UtcNow;
        var alreadyIssued = order.Lines.Any(l => l.Allocations.Any(a => a.AllocationStatus != AllocationStatus.Cancelled));

        // Nếu hàng chưa xuất (đơn cọc/giữ chỗ) → trừ tồn thật bây giờ.
        if (!alreadyIssued)
        {
            foreach (var line in order.Lines)
            {
                var item = await _inventory.GetOrCreateItemAsync(line.SkuId);
                if (item.OnHand < line.Qty) throw new OrderException($"Tồn kho không đủ cho {line.ProductNameSnapshot}.");
                item.OnHand -= line.Qty;
                item.UpdatedDate = now;
                _inventory.AddMovement(new StockMovement
                {
                    SkuId = line.SkuId, Type = (int)StockMovementType.Issue,
                    QtyDelta = -line.Qty, BalanceAfter = item.OnHand, RefType = "Order", RefId = orderId,
                    Reason = $"Giao hàng đơn {order.Code}", PerformedBy = userId, OccurredAt = now, CreatedDate = now,
                });
                line.Allocations.Add(new Allocation { OrderLineId = line.Id, Qty = line.Qty, AllocationStatus = AllocationStatus.Fulfilled, CreatedDate = now });
            }
        }

        // Nhả giữ chỗ (đã giao thực tế).
        foreach (var r in await _reservations.GetByOrderAsync(orderId))
        {
            if (r.ReservationStatus is ReservationStatus.Active or ReservationStatus.Confirmed)
            {
                r.ReservationStatus = ReservationStatus.Released;
                r.UpdatedDate = now;
                var relItem = await _inventory.GetItemAsync(r.SkuId);
                if (relItem is not null) { relItem.Reserved = Math.Max(0, relItem.Reserved - r.Qty); relItem.UpdatedDate = now; }
            }
        }

        // Giao tiền mặt/COD: thu tiền ngay khi giao (Đã giao + Đã thanh toán).
        // KHÔNG áp dụng cho đơn trả góp: phần còn lại do đối tác tài chính giải ngân (ghi phiếu thu riêng), không tự thu khi giao.
        if (order.PaymentMethod is PaymentMethod.COD or PaymentMethod.Cash
            && order.OrderType != OrderType.Installment
            && order.PaymentStatus is not (PaymentStatus.Paid or PaymentStatus.Refunded))
        {
            var paidSoFar = await _payments.GetTotalPaidAsync(orderId);
            var due = order.GrandTotal - paidSoFar;
            if (due > 0)
            {
                _payments.Add(new Payment
                {
                    Code = $"TT{now:yyyyMMddHHmmssfff}", OrderId = orderId, PaymentType = PaymentRecordType.Full,
                    Amount = due, Method = PaymentMethod.Cash, PaymentRecordStatus = PaymentRecordStatus.Paid,
                    Note = "Thu tiền khi giao hàng", RecordedBy = userId, PaidAt = now, CreatedDate = now,
                });
                _db.CashTransactions.Add(new CashTransaction
                {
                    Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Receipt", Category = "CustomerPayment",
                    Amount = due, Method = PaymentMethod.Cash, ReferenceType = "Payment", ReferenceId = orderId,
                    Note = $"Thu tiền khi giao đơn {order.Code}", RecordedBy = userId, OccurredAt = now, CreatedDate = now,
                });
            }
            var payFrom = order.PaymentStatus;
            order.PaymentStatus = PaymentStatus.Paid;
            order.RemainingAmount = 0;
            if (payFrom != PaymentStatus.Paid)
                _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = payFrom, ToStatus = PaymentStatus.Paid, Note = "Thu tiền khi giao", ChangedBy = userId, CreatedDate = now });
        }

        var from = order.OrderStatus;
        order.FulfillmentStatus = FulfillmentStatus.Fulfilled;
        order.OrderStatus = OrderStatus.Delivered; // Đã giao = hoàn tất bán hàng (trục thanh toán tách riêng).
        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = from, ToStatus = OrderStatus.Delivered, Note = "Giao hàng & xuất kho", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();
    }

}
