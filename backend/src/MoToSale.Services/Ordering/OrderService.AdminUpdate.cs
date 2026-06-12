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
}
