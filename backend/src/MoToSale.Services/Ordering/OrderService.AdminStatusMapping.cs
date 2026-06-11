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
    public async Task UpdateOrderAsync(int orderId, UpdateOrderRequest req, int? userId)
        => await _unitOfWork.ExecuteInTransactionAsync(() => UpdateOrderCoreAsync(orderId, req, userId));

    private async Task UpdateOrderCoreAsync(int orderId, UpdateOrderRequest req, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus is OrderStatus.Delivered or OrderStatus.Cancelled)
            throw new OrderException("Đơn đã giao hoặc đã hủy, không thể sửa.");

        var now = DateTime.UtcNow;

        // Thông tin giao/khách + ghi chú — luôn cho sửa (không ảnh hưởng tiền/tồn).
        if (req.ShippingRecipient is not null) order.ShippingRecipient = req.ShippingRecipient.Trim();
        if (req.ShippingPhone is not null) order.ShippingPhone = req.ShippingPhone.Trim();
        order.ShippingEmail = req.ShippingEmail;
        order.ShippingAddress = req.ShippingAddress;
        order.Note = req.Note;
        order.FulfillmentNote = req.FulfillmentNote;
        order.PickupAppointmentAt = req.PickupAppointmentAt;

        // Sửa sản phẩm chỉ khi đơn còn Chờ thanh toán (chưa thu tiền, chưa xuất kho).
        if (req.Lines is { Count: > 0 })
        {
            if (order.OrderStatus != OrderStatus.Pending || order.PaymentStatus != PaymentStatus.Unpaid)
                throw new OrderException("Chỉ sửa được sản phẩm khi đơn đang Chờ xác nhận và chưa thu tiền.");

            // Gỡ giữ chỗ cũ + dòng cũ.
            foreach (var r in await _reservations.GetByOrderAsync(orderId))
            {
                if (r.ReservationStatus is ReservationStatus.Active or ReservationStatus.Confirmed)
                {
                    var it = await _inventory.GetItemAsync(r.SkuId);
                    if (it is not null) { it.Reserved = Math.Max(0, it.Reserved - r.Qty); it.UpdatedDate = now; }
                }
                _reservations.Delete(r);
            }
            _db.OrderLines.RemoveRange(order.Lines);
            await _orders.SaveChangesAsync();

            var newLines = new List<OrderLine>();
            foreach (var l in req.Lines)
            {
                if (l.Qty <= 0) throw new OrderException("Số lượng sản phẩm phải lớn hơn 0.");
                var sku = await _skus.GetByIdAsync(l.SkuId) ?? throw new OrderException($"Không tìm thấy SKU #{l.SkuId}.");
                if (l.Qty > await AvailableForSaleAsync(l.SkuId)) throw new OrderException($"Tồn khả dụng không đủ cho SKU #{l.SkuId}.");
                var product = await _products.GetByIdAsync(sku.ProductId);
                var unitPrice = l.UnitPrice is > 0 ? l.UnitPrice.Value : (sku.SalePrice ?? sku.ListPrice);
                newLines.Add(new OrderLine
                {
                    OrderId = orderId, SkuId = l.SkuId, ProductNameSnapshot = product?.Name ?? "", SkuCodeSnapshot = sku.SkuCode ?? "",
                    UnitPrice = unitPrice, Qty = l.Qty, LineTotal = unitPrice * l.Qty, CreatedDate = now,
                });
            }
            _db.OrderLines.AddRange(newLines);
            await _orders.SaveChangesAsync(); // sinh OrderLine.Id

            foreach (var line in newLines)
            {
                _reservations.Add(new Reservation
                {
                    OrderId = orderId, OrderLineId = line.Id, SkuId = line.SkuId, Qty = line.Qty,
                    ReservationStatus = ReservationStatus.Active, ExpiresAt = now.AddMinutes(HoldMinutes), CreatedDate = now,
                });
                var it = await _inventory.GetOrCreateItemAsync(line.SkuId);
                it.Reserved += line.Qty;
                it.UpdatedDate = now;
            }

            order.Subtotal = newLines.Sum(x => x.LineTotal);
            if (order.DiscountTotal > order.Subtotal) order.DiscountTotal = order.Subtotal;
            order.GrandTotal = order.Subtotal - order.DiscountTotal + order.ShippingFee;
            order.RemainingAmount = order.GrandTotal; // đơn Chờ thanh toán = chưa thu
        }

        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, ToStatus = order.OrderStatus, Note = "Sửa thông tin đơn", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();
    }

    // ===== Status =====
    public async Task CancelOrderAsync(int orderId, string? reason, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new OrderException("Đơn đã hủy.");
        if (order.OrderStatus == OrderStatus.Delivered || order.FulfillmentStatus == FulfillmentStatus.Fulfilled)
            throw new OrderException("Đơn đã giao, không thể hủy. Hãy tạo phiếu đổi trả/hoàn tiền nếu cần.");

        var now = DateTime.UtcNow;

        // Đã phân phối / đã xuất kho (Allocated hoặc Shipped) → trả tồn về kho.
        if (order.FulfillmentStatus is FulfillmentStatus.Allocated or FulfillmentStatus.Shipped)
        {
            foreach (var line in order.Lines)
            {
                foreach (var alloc in line.Allocations.Where(x => x.AllocationStatus != AllocationStatus.Cancelled))
                {
                    var item = await _inventory.GetOrCreateItemAsync(line.SkuId);
                    item.OnHand += alloc.Qty;
                    item.UpdatedDate = now;
                    _inventory.AddMovement(new StockMovement
                    {
                        SkuId = line.SkuId, Type = (int)StockMovementType.Receipt,
                        QtyDelta = +alloc.Qty, BalanceAfter = item.OnHand, RefType = "Order", RefId = orderId,
                        Reason = $"Hủy đơn {order.Code}", PerformedBy = userId, OccurredAt = now, CreatedDate = now,
                    });
                    alloc.AllocationStatus = AllocationStatus.Cancelled;
                }
            }
        }

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

        // Hoàn lại lượt voucher đã trừ khi tạo đơn (đơn hủy = không tiêu thụ lượt).
        if (order.VoucherId is int vid)
        {
            var voucher = await _voucherRepo.GetByIdAsync(vid);
            if (voucher is not null && voucher.UsedCount > 0)
            {
                voucher.UsedCount--; voucher.UpdatedDate = now; _voucherRepo.Update(voucher);
            }
        }

        // Hủy mọi phiếu chuyển khoản còn chờ xác nhận của đơn.
        foreach (var p in await _payments.GetByOrderAsync(orderId))
        {
            if (p.PaymentRecordStatus == PaymentRecordStatus.Pending)
            {
                p.PaymentRecordStatus = PaymentRecordStatus.Cancelled;
                p.Note = string.IsNullOrWhiteSpace(p.Note) ? "Hủy đơn" : $"{p.Note} | Hủy đơn";
                p.UpdatedDate = now;
                _payments.Update(p);
            }
        }

        // Trạng thái thanh toán sau khi hủy (trục độc lập với trạng thái đơn).
        var totalPaid = await _payments.GetTotalPaidAsync(orderId);
        var payBefore = order.PaymentStatus;
        if (totalPaid > 0)
        {
            // Đã thu tiền → hoàn tiền cho khách (chi quỹ) + đánh dấu Đã hoàn tiền để sổ sách cân.
            _db.CashTransactions.Add(new CashTransaction
            {
                Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Payment", Category = "Refund",
                Amount = totalPaid, Method = order.PaymentMethod, ReferenceType = "Order", ReferenceId = orderId,
                Note = $"Hoàn tiền hủy đơn {order.Code}", RecordedBy = userId, OccurredAt = now, CreatedDate = now,
            });
            order.PaymentStatus = PaymentStatus.Refunded;
            order.RemainingAmount = 0;
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = orderId, FromStatus = payBefore, ToStatus = PaymentStatus.Refunded,
                Note = $"Hoàn tiền {totalPaid:n0}đ khi hủy đơn", ChangedBy = userId, CreatedDate = now,
            });
        }
        else if (payBefore == PaymentStatus.PendingConfirmation)
        {
            // Chuyển khoản không hoàn tất / quá hạn → Thanh toán thất bại.
            order.PaymentStatus = PaymentStatus.Failed;
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = orderId, FromStatus = payBefore, ToStatus = PaymentStatus.Failed,
                Note = "Chuyển khoản không hoàn tất khi hủy đơn", ChangedBy = userId, CreatedDate = now,
            });
        }

        var from = order.OrderStatus;
        order.OrderStatus = OrderStatus.Cancelled;
        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = from, ToStatus = OrderStatus.Cancelled, Note = reason ?? "Hủy đơn", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(int orderId, UpdateOrderStatusRequest req, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        var toStatus = NormalizeAdminOrderStatus(req.ToStatus);
        var allowed = new HashSet<string> { OrderStatus.Pending, OrderStatus.Shipping, OrderStatus.Delivered, OrderStatus.Cancelled };
        if (!allowed.Contains(toStatus)) throw new OrderException("Invalid order status.");
        if (toStatus == OrderStatus.Cancelled)
        {
            await CancelOrderAsync(orderId, req.Note, userId);
            return;
        }
        if (toStatus == OrderStatus.Delivered)
        {
            await _unitOfWork.ExecuteInTransactionAsync(() => FulfillCoreAsync(orderId, userId));
            return;
        }
        if (order.OrderStatus is OrderStatus.Delivered or OrderStatus.Cancelled)
            throw new OrderException("Đơn đã kết thúc, không thể cập nhật trạng thái.");
        var from = order.OrderStatus;
        var fulfillmentFrom = order.FulfillmentStatus;
        var now = DateTime.UtcNow;
        order.OrderStatus = toStatus;
        if (toStatus == OrderStatus.Pending) order.FulfillmentStatus = FulfillmentStatus.Unallocated;
        if (toStatus == OrderStatus.Shipping) order.FulfillmentStatus = FulfillmentStatus.Shipped;
        order.UpdatedDate = now;
        _orders.Update(order);
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = from, ToStatus = toStatus, Note = req.Note, ChangedBy = userId, CreatedDate = now });
        if (order.FulfillmentStatus != fulfillmentFrom)
        {
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = orderId, FromStatus = fulfillmentFrom, ToStatus = order.FulfillmentStatus,
                Note = "FulfillmentStatus: Synced from order status", ChangedBy = userId, CreatedDate = now,
            });
        }
        await _orders.SaveChangesAsync();
    }

    // Chấp nhận cả giá trị cũ (AwaitingPayment/Confirmed/Allocated/Completed) lẫn mới → quy về 4 trạng thái.
    private static string NormalizeAdminOrderStatus(string? status) => status switch
    {
        "Pending" or "AwaitingPayment" or "Confirmed" => OrderStatus.Pending,
        "Allocated" or "Shipping" => OrderStatus.Shipping,
        "Completed" or "Delivered" => OrderStatus.Delivered,
        "Cancelled" => OrderStatus.Cancelled,
        _ => status ?? string.Empty,
    };

    public async Task UpdateFulfillmentStatusAsync(int orderId, UpdateFulfillmentStatusRequest req, int? userId)
    {
        var mappedOrderStatus = req.ToStatus switch
        {
            FulfillmentStatus.Unallocated => OrderStatus.Pending,
            FulfillmentStatus.Allocated or FulfillmentStatus.Shipped => OrderStatus.Shipping,
            FulfillmentStatus.Fulfilled => OrderStatus.Delivered,
            _ => throw new OrderException("Invalid fulfillment status."),
        };

        await UpdateStatusAsync(orderId, new UpdateOrderStatusRequest(mappedOrderStatus, req.Note), userId);
    }
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
