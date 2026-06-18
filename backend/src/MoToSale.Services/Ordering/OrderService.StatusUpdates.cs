using Microsoft.EntityFrameworkCore;
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
    // ===== Status =====
    public async Task CancelOrderAsync(int orderId, string? reason, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new OrderException("Đơn đã hủy.");
        if (order.OrderStatus == OrderStatus.Delivered || order.FulfillmentStatus == FulfillmentStatus.Fulfilled)
            throw new OrderException("Đơn đã giao, không thể hủy. Hãy tạo phiếu đổi trả/hoàn tiền nếu cần.");
        if (order.OrderType == OrderType.Installment)
            throw new OrderException("Đơn trả góp đã được duyệt không thể hủy từ hệ thống. Vui lòng xử lý với đối tác tài chính nếu cần điều chỉnh.");

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
        var allowed = new HashSet<string> { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Shipping, OrderStatus.Delivered, OrderStatus.Cancelled };
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
        // Soạn hàng / Đang giao: phải XUẤT KHO thật + nhả giữ chỗ (giống nút "Soạn & xuất kho"),
        // không chỉ lật cờ — nếu không, đơn "đang giao" mà tồn kho vẫn chưa trừ.
        if (toStatus is OrderStatus.Preparing or OrderStatus.Shipping)
        {
            await _unitOfWork.ExecuteInTransactionAsync(() => PrepareOrShipCoreAsync(orderId, toStatus, req.Note, userId));
            return;
        }

        // Còn lại: quay về Chờ xác nhận (Pending).
        if (order.OrderStatus is OrderStatus.Delivered or OrderStatus.Cancelled)
            throw new OrderException("Đơn đã kết thúc, không thể cập nhật trạng thái.");
        // Đã xuất kho rồi thì không cho lùi về Chờ xác nhận (sẽ làm thất thoát tồn). Muốn trả tồn → hủy đơn.
        bool alreadyIssued = order.Lines.Any(l => l.Allocations.Any(a => a.AllocationStatus != AllocationStatus.Cancelled));
        if (alreadyIssued)
            throw new OrderException("Đơn đã xuất kho, không thể quay lại Chờ xác nhận. Hãy hủy đơn nếu muốn trả tồn về kho.");

        var from = order.OrderStatus;
        var fulfillmentFrom = order.FulfillmentStatus;
        var now = DateTime.UtcNow;
        order.OrderStatus = toStatus;
        order.FulfillmentStatus = FulfillmentStatus.Unallocated;
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

    // Chuyển đơn sang Soạn hàng (Allocated) hoặc Đang giao (Shipped): xuất kho thật + nhả giữ chỗ.
    private async Task PrepareOrShipCoreAsync(int orderId, string toStatus, string? note, int? userId)
    {
        var order = await _orders.GetDetailAsync(orderId) ?? throw new OrderException("Không tìm thấy đơn hàng.");
        if (order.OrderStatus == OrderStatus.Cancelled) throw new OrderException("Đơn đã hủy.");
        if (order.OrderStatus == OrderStatus.Delivered || order.FulfillmentStatus == FulfillmentStatus.Fulfilled)
            throw new OrderException("Đơn đã giao, không thể đổi về Soạn hàng/Đang giao.");

        var now = DateTime.UtcNow;
        var from = order.OrderStatus;
        var fulfillmentFrom = order.FulfillmentStatus;

        await IssueStockAndReleaseHoldsAsync(order, userId, now);

        order.FulfillmentStatus = toStatus == OrderStatus.Preparing ? FulfillmentStatus.Allocated : FulfillmentStatus.Shipped;
        order.OrderStatus = toStatus;
        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = orderId, FromStatus = from, ToStatus = toStatus, Note = note, ChangedBy = userId, CreatedDate = now });
        if (order.FulfillmentStatus != fulfillmentFrom)
        {
            _orders.AddStatusHistory(new OrderStatusHistory
            {
                OrderId = orderId, FromStatus = fulfillmentFrom, ToStatus = order.FulfillmentStatus,
                Note = "Xuất kho khi đổi trạng thái", ChangedBy = userId, CreatedDate = now,
            });
        }
        await _orders.SaveChangesAsync();
    }

    // #1: tự hủy đơn "Chờ xác nhận chuyển khoản" có phiếu CK chờ quá lâu (quá graceHours)
    // để nhả giữ chỗ — tránh hàng bị giữ vĩnh viễn khi khách báo CK nhưng không thanh toán.
    public async Task<int> CancelStaleTransferClaimsAsync(int graceHours, int? userId)
    {
        var cutoff = DateTime.UtcNow.AddHours(-graceHours);
        var orderIds = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.PendingConfirmation
                && o.OrderStatus != OrderStatus.Cancelled
                && o.OrderStatus != OrderStatus.Delivered
                && _db.Payments.Any(p => p.OrderId == o.Id
                    && p.PaymentRecordStatus == PaymentRecordStatus.Pending
                    && p.CreatedDate < cutoff))
            .Select(o => o.Id)
            .ToListAsync();

        int cancelled = 0;
        foreach (var id in orderIds)
        {
            try
            {
                await CancelOrderAsync(id, "Chuyển khoản quá hạn xác nhận — hệ thống tự hủy.", userId);
                cancelled++;
            }
            catch (OrderException)
            {
                // Đơn vừa đổi trạng thái bởi luồng khác — bỏ qua, vòng sau xử lý nếu còn.
            }
        }

        return cancelled;
    }

    // Chấp nhận cả giá trị cũ (AwaitingPayment/Confirmed/Allocated/Completed) lẫn mới.
    private static string NormalizeAdminOrderStatus(string? status) => status switch
    {
        "Pending" or "AwaitingPayment" or "Checkout" or "Confirmed" => OrderStatus.Pending,
        "Preparing" or "Allocated" => OrderStatus.Preparing,
        "Shipping" => OrderStatus.Shipping,
        "Completed" or "Delivered" => OrderStatus.Delivered,
        "Cancelled" => OrderStatus.Cancelled,
        _ => status ?? string.Empty,
    };

    public async Task UpdateFulfillmentStatusAsync(int orderId, UpdateFulfillmentStatusRequest req, int? userId)
    {
        var mappedOrderStatus = req.ToStatus switch
        {
            FulfillmentStatus.Unallocated => OrderStatus.Pending,
            FulfillmentStatus.Allocated => OrderStatus.Preparing,
            FulfillmentStatus.Shipped => OrderStatus.Shipping,
            FulfillmentStatus.Fulfilled => OrderStatus.Delivered,
            _ => throw new OrderException("Invalid fulfillment status."),
        };

        await UpdateStatusAsync(orderId, new UpdateOrderStatusRequest(mappedOrderStatus, req.Note), userId);
    }
}
