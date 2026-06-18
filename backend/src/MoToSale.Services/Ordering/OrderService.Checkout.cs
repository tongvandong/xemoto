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
        // Đơn online chỉ hỗ trợ thanh toán toàn bộ hoặc đặt cọc. Trả góp phải qua luồng gửi hồ sơ
        // (/installment-applications) để cửa hàng thẩm định rồi mới lập đơn — tránh tạo đơn trả góp
        // "rỗng cọc" bị đòi 100% tiền.
        if (req.OrderType == OrderType.Installment)
            throw new OrderException("Đơn trả góp cần gửi hồ sơ để cửa hàng thẩm định, không đặt trực tiếp.");

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
            OrderType = req.OrderType == OrderType.Deposit ? OrderType.Deposit : OrderType.FullPayment,
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

        // Nạp SKU + sản phẩm cho cả giỏ bằng hai truy vấn thay vì 2N truy vấn trong vòng lặp.
        var cartSkuIds = cart.Items.Select(i => i.SkuId).Distinct().ToList();
        var skusById = (await _skus.FindAsync(s => cartSkuIds.Contains(s.Id))).ToDictionary(s => s.Id);
        var productIds = skusById.Values.Select(s => s.ProductId).Distinct().ToList();
        var productsById = (await _products.FindAsync(p => productIds.Contains(p.Id))).ToDictionary(p => p.Id);

        foreach (var item in cart.Items)
        {
            skusById.TryGetValue(item.SkuId, out var sku);
            Product? product = sku is not null && productsById.TryGetValue(sku.ProductId, out var p) ? p : null;
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
        }

        // Đơn online CHƯA thu đồng nào lúc tạo (khách chuyển khoản sau), nên số còn phải thu = toàn bộ tổng đơn.
        // DepositAmount chỉ là khoản cọc DỰ KIẾN; khi khách trả cọc, UpdateOrderAfterPaidAmount sẽ trừ dần
        // RemainingAmount theo số đã thu thực tế. (Trước đây trừ cọc ngay tại đây khiến "tiền còn lại" bị sai.)
        order.RemainingAmount = order.GrandTotal;

        _orders.Add(order);
        await _orders.SaveChangesAsync(); // sinh OrderId + OrderLine.Id

        // Giữ chỗ tồn ATOMIC trước, gom các bản ghi Reservation rồi mới Add một lượt
        // (tránh có thay đổi tracked đang chờ khi gọi ExecuteUpdate). Nếu một SKU vừa hết
        // tồn do request khác giữ trước, ném lỗi để rollback toàn bộ giao dịch checkout.
        var reservationsToAdd = new List<Reservation>();
        foreach (var line in order.Lines)
        {
            bool reserved = await _inventory.TryReserveAsync(line.SkuId, line.Qty, now);
            if (!reserved)
                throw new OrderException("Một số sản phẩm vừa hết tồn khả dụng. Vui lòng thử lại.");

            reservationsToAdd.Add(new Reservation
            {
                OrderId = order.Id,
                OrderLineId = line.Id,
                SkuId = line.SkuId,
                Qty = line.Qty,
                ReservationStatus = ReservationStatus.Active,
                ExpiresAt = now.AddMinutes(HoldMinutes),
                CreatedDate = now,
            });
        }

        foreach (var reservation in reservationsToAdd)
            _reservations.Add(reservation);

        _cart.ClearItems(cart.Items);
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = order.Id, ToStatus = OrderStatus.Pending, Note = "Tạo đơn", ChangedBy = userId, CreatedDate = now });
        await _orders.SaveChangesAsync();

        return order.Id;
    }
}
