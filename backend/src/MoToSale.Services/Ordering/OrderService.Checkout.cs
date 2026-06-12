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
    public async Task<int> CheckoutAsync(int userId, CheckoutRequest req)
    {
        return await _unitOfWork.ExecuteInTransactionAsync(() => CheckoutCoreAsync(userId, req));
    }

    private async Task<int> CheckoutCoreAsync(int userId, CheckoutRequest req)
    {
        var cart = await _cart.GetWithItemsAsync(userId);
        if (cart is null || cart.Items.Count == 0) throw new OrderException("Giỏ hàng trống.");

        foreach (var item in cart.Items)
        {
            if (item.Qty > await AvailableForSaleAsync(item.SkuId))
                throw new OrderException("Một số sản phẩm không đủ tồn khả dụng.");
        }

        var now = DateTime.UtcNow;
        var paymentMethod = req.PaymentMethod == PaymentMethod.BankTransfer ? PaymentMethod.BankTransfer : PaymentMethod.COD;
        var order = new Order
        {
            Code = $"DH{now:yyyyMMddHHmmssfff}",
            UserId = userId,
            Channel = "Online",
            OrderType = req.OrderType is OrderType.Deposit or OrderType.Installment ? req.OrderType : OrderType.FullPayment,
            OrderStatus = OrderStatus.Pending,
            PaymentMethod = paymentMethod,
            PaymentStatus = PaymentStatus.Unpaid,
            FulfillmentStatus = FulfillmentStatus.Unallocated,
            ShippingRecipient = req.ShippingRecipient,
            ShippingPhone = req.ShippingPhone,
            ShippingEmail = req.ShippingEmail,
            ShippingAddress = req.ShippingAddress,
            ReceivingMethod = req.ReceivingMethod,
            ShippingFee = req.ShippingFee,
            Note = req.Note,
            FulfillmentNote = req.FulfillmentNote,
            PickupAppointmentAt = req.PickupAppointmentAt,
            PlacedAt = now,
            CreatedDate = now,
        };

        foreach (var item in cart.Items)
        {
            var sku = await _skus.GetByIdAsync(item.SkuId)!;
            var product = sku is null ? null : await _products.GetByIdAsync(sku.ProductId);
            order.Lines.Add(new OrderLine
            {
                SkuId = item.SkuId,
                ProductNameSnapshot = product?.Name ?? "",
                SkuCodeSnapshot = sku?.SkuCode ?? "",
                UnitPrice = item.UnitPriceSnapshot,
                Qty = item.Qty,
                LineTotal = item.UnitPriceSnapshot * item.Qty,
                CreatedDate = now,
            });
        }

        order.Subtotal = order.Lines.Sum(l => l.LineTotal);
        order.DiscountTotal = 0;

        if (!string.IsNullOrWhiteSpace(req.VoucherCode))
        {
            var vr = await _vouchers.ValidateAsync(req.VoucherCode, order.Subtotal);
            if (!vr.Valid) throw new OrderException(vr.Message ?? "Voucher không hợp lệ.");
            order.DiscountTotal = vr.DiscountAmount;
            var voucher = await _voucherRepo.GetByCodeAsync(req.VoucherCode.Trim().ToUpperInvariant());
            if (voucher is not null)
            {
                if (voucher.PerUserLimit is int lim && lim > 0)
                {
                    var usedByUser = (await _orders.GetByUserAsync(userId))
                        .Count(o => o.VoucherId == voucher.Id && o.OrderStatus != OrderStatus.Cancelled);
                    if (usedByUser >= lim) throw new OrderException("Bạn đã dùng hết lượt voucher cho tài khoản này.");
                }
                order.VoucherId = voucher.Id;
                voucher.UsedCount++; voucher.UpdatedDate = now; _voucherRepo.Update(voucher);
            }
        }

        order.GrandTotal = order.Subtotal - order.DiscountTotal + order.ShippingFee;

        if (order.OrderType == OrderType.Deposit)
        {
            if (req.DepositAmount <= 0 || req.DepositAmount >= order.GrandTotal)
                throw new OrderException("Tiền đặt cọc không hợp lệ.");
            order.DepositAmount = req.DepositAmount;
            order.RemainingAmount = order.GrandTotal - req.DepositAmount;
        }
        else
        {
            order.RemainingAmount = order.GrandTotal;
        }

        _orders.Add(order);
        await _orders.SaveChangesAsync(); // sinh OrderId + OrderLine.Id

        foreach (var line in order.Lines)
        {
            _reservations.Add(new Reservation
            {
                OrderId = order.Id,
                OrderLineId = line.Id,
                SkuId = line.SkuId,
                Qty = line.Qty,
                ReservationStatus = ReservationStatus.Active,
                ExpiresAt = now.AddMinutes(HoldMinutes),
                CreatedDate = now,
            });
            var resItem = await _inventory.GetOrCreateItemAsync(line.SkuId);
            resItem.Reserved += line.Qty;
            resItem.UpdatedDate = now;
        }

        _cart.ClearItems(cart.Items);
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = order.Id, ToStatus = OrderStatus.Pending, Note = "Tạo đơn", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();

        return order.Id;
    }
}
