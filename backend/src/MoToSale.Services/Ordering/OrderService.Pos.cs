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
    // ===== Bán tại quầy (POS) =====
    public async Task<int> CreatePosOrderAsync(PosOrderRequest req, int? staffUserId)
        => await _unitOfWork.ExecuteInTransactionAsync(() => CreatePosOrderCoreAsync(req, staffUserId));

    private async Task<int> CreatePosOrderCoreAsync(PosOrderRequest req, int? staffUserId)
    {
        if (req.Lines is null || req.Lines.Count == 0) throw new OrderException("Đơn tại quầy phải có ít nhất một sản phẩm.");

        var now = DateTime.UtcNow;
        var isDeposit = req.OrderType == OrderType.Deposit;
        var isInstallment = req.OrderType == OrderType.Installment;  // trả góp qua đối tác: giữ chỗ + giao hàng bình thường sau duyệt
        var reserveOnly = isDeposit || isInstallment;               // giữ chỗ tồn, xuất kho khi giao
        var paymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? PaymentMethod.Cash : req.PaymentMethod;
        if (!IsManualPaymentMethod(paymentMethod))
            throw new OrderException("Bán tại quầy chỉ hỗ trợ thanh toán tiền mặt hoặc chuyển khoản.");

        // Khách hàng: dùng khách đã chọn, hoặc khách lẻ (tự tạo nếu chưa có).
        var customerId = req.CustomerId is > 0 ? req.CustomerId.Value : await GetOrCreateWalkInCustomerAsync(now);

        var order = new Order
        {
            Code = $"POS{now:yyyyMMddHHmmssfff}",
            UserId = customerId,
            Channel = "InStore",
            OrderType = isDeposit ? OrderType.Deposit : isInstallment ? OrderType.Installment : OrderType.FullPayment,
            OrderStatus = OrderStatus.Pending,
            PaymentMethod = paymentMethod,
            PaymentStatus = PaymentStatus.Unpaid,
            FulfillmentStatus = FulfillmentStatus.Unallocated,
            ShippingRecipient = string.IsNullOrWhiteSpace(req.CustomerName) ? "Khách lẻ" : req.CustomerName.Trim(),
            ShippingPhone = req.CustomerPhone ?? "",
            ShippingEmail = string.IsNullOrWhiteSpace(req.CustomerEmail) ? null : req.CustomerEmail.Trim(),
            ShippingAddress = string.IsNullOrWhiteSpace(req.ShippingAddress) ? null : req.ShippingAddress.Trim(),
            ReceivingMethod = string.IsNullOrWhiteSpace(req.ReceivingMethod) ? "Pickup" : req.ReceivingMethod.Trim(),
            Note = req.Note,
            PlacedAt = now,
            CreatedDate = now,
        };

        foreach (var l in req.Lines)
        {
            if (l.Qty <= 0) throw new OrderException("Số lượng sản phẩm phải lớn hơn 0.");
            var sku = await _skus.GetByIdAsync(l.SkuId) ?? throw new OrderException($"Không tìm thấy SKU #{l.SkuId}.");
            var product = await _products.GetByIdAsync(sku.ProductId);
            var unitPrice = l.UnitPrice is > 0 ? l.UnitPrice.Value : (sku.SalePrice ?? sku.ListPrice);
            order.Lines.Add(new OrderLine
            {
                SkuId = l.SkuId,
                ProductNameSnapshot = product?.Name ?? "",
                SkuCodeSnapshot = sku.SkuCode ?? "",
                UnitPrice = unitPrice,
                Qty = l.Qty,
                LineTotal = unitPrice * l.Qty,
                CreatedDate = now,
            });
        }

        order.Subtotal = order.Lines.Sum(x => x.LineTotal);
        order.DiscountTotal = 0;
        if (!string.IsNullOrWhiteSpace(req.VoucherCode))
        {
            var vr = await _vouchers.ValidateAsync(req.VoucherCode, order.Subtotal);
            if (!vr.Valid) throw new OrderException(vr.Message ?? "Voucher không hợp lệ.");
            order.DiscountTotal = vr.DiscountAmount;
            var voucher = await _voucherRepo.GetByCodeAsync(req.VoucherCode.Trim().ToUpperInvariant());
            if (voucher is not null) { order.VoucherId = voucher.Id; voucher.UsedCount++; voucher.UpdatedDate = now; _voucherRepo.Update(voucher); }
        }
        order.GrandTotal = order.Subtotal - order.DiscountTotal; // bán tại quầy không tính phí ship

        if (isDeposit)
        {
            if (req.DepositAmount <= 0 || req.DepositAmount >= order.GrandTotal)
                throw new OrderException("Tiền đặt cọc không hợp lệ (0 < cọc < tổng tiền).");
            order.DepositAmount = req.DepositAmount;
            order.RemainingAmount = order.GrandTotal - req.DepositAmount;
        }
        else
        {
            // Trả góp: trả trước (DepositAmount) chỉ tham chiếu, 0 <= trả trước < tổng; còn lại do đối tác giải ngân.
            if (isInstallment && (req.DepositAmount <= 0 || req.DepositAmount >= order.GrandTotal))
                throw new OrderException("Tiền trả trước không hợp lệ (0 < trả trước < tổng tiền).");
            if (isInstallment) order.DepositAmount = req.DepositAmount;
            order.RemainingAmount = order.GrandTotal;
        }

        _orders.Add(order);
        await _orders.SaveChangesAsync(); // sinh OrderId + OrderLine.Id

        if (!reserveOnly)
        {
            // Bán đứt tại quầy → xuất kho ngay (tôn trọng hàng đang giữ chỗ cho đơn cọc/trả góp).
            foreach (var line in order.Lines)
            {
                if (line.Qty > await AvailableForSaleAsync(line.SkuId))
                    throw new OrderException($"Tồn khả dụng không đủ cho {line.ProductNameSnapshot}.");
                var item = await _inventory.GetOrCreateItemAsync(line.SkuId);
                item.OnHand -= line.Qty;
                item.UpdatedDate = now;
                _inventory.AddMovement(new StockMovement
                {
                    SkuId = line.SkuId, Type = (int)StockMovementType.Issue,
                    QtyDelta = -line.Qty, BalanceAfter = item.OnHand, RefType = "Order", RefId = order.Id,
                    Reason = $"Bán tại quầy {order.Code}", PerformedBy = staffUserId, OccurredAt = now, CreatedDate = now,
                });
                line.Allocations.Add(new Allocation { OrderLineId = line.Id, Qty = line.Qty, AllocationStatus = AllocationStatus.Fulfilled, CreatedDate = now });
            }
            order.FulfillmentStatus = FulfillmentStatus.Fulfilled;
        }
        else
        {
            // Đặt cọc / trả góp → giữ chỗ tồn ATOMIC, xuất kho khi giao xe.
            var holdUntil = isInstallment ? now.AddDays(30) : now.AddDays(7);
            var reservationsToAdd = new List<Reservation>();
            foreach (var line in order.Lines)
            {
                if (!await _inventory.TryReserveAsync(line.SkuId, line.Qty, now))
                    throw new OrderException($"Tồn khả dụng không đủ cho {line.ProductNameSnapshot}.");
                reservationsToAdd.Add(new Reservation
                {
                    OrderId = order.Id, OrderLineId = line.Id, SkuId = line.SkuId, Qty = line.Qty,
                    ReservationStatus = ReservationStatus.Confirmed, ExpiresAt = holdUntil, CreatedDate = now,
                });
            }

            foreach (var reservation in reservationsToAdd)
                _reservations.Add(reservation);
        }

        // Ghi nhận tiền đã thu tại quầy + thu quỹ.
        var paid = Math.Max(0, req.PaidAmount);
        if (paid > order.GrandTotal) throw new OrderException("Tiền thu vượt quá giá trị đơn.");
        if (isDeposit && paid < order.DepositAmount) throw new OrderException("Tiền thu phải tối thiểu bằng tiền cọc.");
        if (paid > 0)
        {
            _payments.Add(new Payment
            {
                Code = $"TT{now:yyyyMMddHHmmssfff}", OrderId = order.Id,
                PaymentType = (isDeposit || isInstallment) ? PaymentRecordType.Deposit : PaymentRecordType.Full,
                Amount = paid, Method = paymentMethod, PaymentRecordStatus = PaymentRecordStatus.Paid,
                Note = isInstallment ? "Cọc/trả trước ban đầu (trả góp)" : "Thu tại quầy", RecordedBy = staffUserId, PaidAt = now, CreatedDate = now,
            });
            _db.CashTransactions.Add(new CashTransaction
            {
                Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Receipt", Category = "CustomerPayment",
                Amount = paid, Method = paymentMethod, ReferenceType = "Payment", ReferenceId = order.Id,
                Note = $"Thu tại quầy {order.Code}", RecordedBy = staffUserId, OccurredAt = now, CreatedDate = now,
            });
            order.RemainingAmount = Math.Max(0, order.GrandTotal - paid);
            // Đơn trả góp chỉ thu khoản trả trước tại cửa hàng; phần còn lại do đối tác tài chính xử lý ngoài hệ thống.
            order.PaymentStatus = isInstallment || paid >= order.GrandTotal ? PaymentStatus.Paid : PaymentStatus.Unpaid;
        }

        // Bán đứt tại quầy: giao ngay -> "Đã giao". (Đơn cọc/trả góp đi tiếp luồng giao hàng từ trạng thái chờ xác nhận.)
        if (!reserveOnly)
            order.OrderStatus = OrderStatus.Delivered;

        order.UpdatedDate = now;
        _orders.AddStatusHistory(new OrderStatusHistory { OrderId = order.Id, ToStatus = order.OrderStatus, Note = "Tạo đơn tại quầy (POS)", ChangedBy = staffUserId, CreatedDate = now });
        await _orders.SaveChangesAsync();
        return order.Id;
    }

    private static bool IsManualPaymentMethod(string? method) =>
        method is PaymentMethod.Cash or PaymentMethod.BankTransfer;

    private async Task<int> GetOrCreateWalkInCustomerAsync(DateTime now)
    {
        const string walkInEmail = "khachle@motosale.local";
        var existing = await _users.FindAsync(u => u.Email == walkInEmail);
        if (existing.Count > 0) return existing[0].Id;
        var user = new User
        {
            FullName = "Khách lẻ",
            Email = walkInEmail,
            PasswordHash = "-", // tài khoản hệ thống, không đăng nhập
            Status = (int)EntityStatus.Active,
            CreatedDate = now,
        };
        _users.Add(user);
        await _users.SaveChangesAsync();
        return user.Id;
    }
}
