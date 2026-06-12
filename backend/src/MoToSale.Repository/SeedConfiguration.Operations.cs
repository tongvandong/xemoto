using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;

namespace MoToSale.Repository;

// Seed dữ liệu vận hành: đơn hàng demo, lịch sử trạng thái, thanh toán, đánh giá, bảo hành.
public static partial class SeedConfiguration
{
    private static async Task AddMissingOperationalDataAsync(AppDbContext db, DateTime now)
    {
        if (await db.Orders.AnyAsync(x => x.Code.StartsWith("DEMO-"))) return;

        var users = await db.Users.ToDictionaryAsync(x => x.Email);
        var skuRows = await (from sku in db.Skus
                             join product in db.Products on sku.ProductId equals product.Id
                             select new { sku.Id, sku.SkuCode, ProductName = product.Name, Price = sku.SalePrice ?? sku.ListPrice })
            .ToDictionaryAsync(x => x.SkuCode);
        var staffId = users["staff@motosale.local"].Id;

        var orders = new[]
        {
            Order("DEMO-2026-001", "customer@motosale.local", OrderStatus.Pending, PaymentStatus.Unpaid, FulfillmentStatus.Unallocated, 0, 0, "SP-VISION-TC"),
            Order("DEMO-2026-002", "minhanh@example.com", OrderStatus.Pending, PaymentStatus.Paid, FulfillmentStatus.Unallocated, 1, 200_000, "PT-LOP-MICH-8090", "PT-MAPHANH-HONDA"),
            Order("DEMO-2026-003", "quochuy@example.com", OrderStatus.Shipping, PaymentStatus.Paid, FulfillmentStatus.Shipped, 3, 1_000_000, "SP-EX155-ABS"),
            Order("DEMO-2026-004", "hoangnam@example.com", OrderStatus.Delivered, PaymentStatus.Paid, FulfillmentStatus.Fulfilled, 8, 0, "SP-AB160-TC"),
            Order("DEMO-2026-005", "thutrang@example.com", OrderStatus.Delivered, PaymentStatus.Paid, FulfillmentStatus.Fulfilled, 15, 0, "SP-WAVE-TC", "PT-NHOT-HONDA-10"),
            Order("DEMO-2026-006", "customer@motosale.local", OrderStatus.Cancelled, PaymentStatus.Unpaid, FulfillmentStatus.Unallocated, 5, 0, "PT-MBH-DEN-M"),
        };
        db.Orders.AddRange(orders);
        await db.SaveChangesAsync();

        foreach (var order in orders)
        {
            db.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = order.Id, ToStatus = OrderStatus.Pending, Note = "Tạo đơn dữ liệu mẫu", ChangedBy = order.UserId, CreatedDate = order.CreatedDate });
            if (order.OrderStatus != OrderStatus.Pending)
                db.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = order.Id, FromStatus = OrderStatus.Pending, ToStatus = order.OrderStatus, Note = "Cập nhật trạng thái dữ liệu mẫu", ChangedBy = staffId, CreatedDate = order.CreatedDate.AddHours(3) });
            if (order.PaymentStatus == PaymentStatus.Paid)
                db.Payments.Add(new Payment { Code = $"PAY-{order.Code}", OrderId = order.Id, PaymentType = PaymentRecordType.Full, Amount = order.GrandTotal, Method = order.Id % 2 == 0 ? PaymentMethod.BankTransfer : PaymentMethod.Cash, PaymentRecordStatus = PaymentRecordStatus.Paid, RecordedBy = staffId, PaidAt = order.CreatedDate.AddHours(2), CreatedDate = order.CreatedDate.AddHours(2), Note = "Thanh toán dữ liệu mẫu" });
        }
        await db.SaveChangesAsync();

        var delivered = orders.First(x => x.Code == "DEMO-2026-004");
        var deliveredLine = delivered.Lines.First();
        db.Reviews.Add(new Review { ProductId = (await db.Skus.FindAsync(deliveredLine.SkuId))!.ProductId, UserId = delivered.UserId, OrderId = delivered.Id, Rating = 5, Title = "Xe vận hành ổn định", Comment = "Nhân viên tư vấn rõ ràng, giao xe đúng hẹn.", ReviewStatus = "Approved", CreatedDate = delivered.CreatedDate.AddDays(2) });
        db.Warranties.Add(new Warranty { Code = "BH-DEMO-0001", OrderId = delivered.Id, OrderLineId = deliveredLine.Id, SkuId = deliveredLine.SkuId, CustomerId = delivered.UserId, ProductSnapshot = deliveredLine.ProductNameSnapshot, SerialNumber = "FRAME-DEMO-AB160-001", StartAt = delivered.CreatedDate, Months = 36, WarrantyStatus = "Active", Note = "Bảo hành xe máy dữ liệu mẫu", CreatedDate = delivered.CreatedDate });

        Order Order(string code, string email, string orderStatus, string paymentStatus, string fulfillmentStatus, int daysAgo, decimal discount, params string[] skuCodes)
        {
            var lines = skuCodes.Select(skuCode =>
            {
                var sku = skuRows[skuCode];
                return new OrderLine { SkuId = sku.Id, ProductNameSnapshot = sku.ProductName, SkuCodeSnapshot = sku.SkuCode, UnitPrice = sku.Price, Qty = 1, LineTotal = sku.Price, CreatedDate = now.AddDays(-daysAgo) };
            }).ToList();
            var subtotal = lines.Sum(x => x.LineTotal);
            return new Order
            {
                Code = code, UserId = users[email].Id, Channel = "Online", OrderType = OrderType.FullPayment,
                OrderStatus = orderStatus, PaymentStatus = paymentStatus, FulfillmentStatus = fulfillmentStatus,
                Subtotal = subtotal, DiscountTotal = discount, ShippingFee = 0, GrandTotal = subtotal - discount,
                RemainingAmount = paymentStatus == PaymentStatus.Paid ? 0 : subtotal - discount,
                ShippingRecipient = users[email].FullName, ShippingPhone = users[email].PhoneNumber ?? "", ShippingAddress = "Địa chỉ giao hàng dữ liệu mẫu",
                ReceivingMethod = "Delivery", Note = "Đơn hàng dữ liệu mẫu", PlacedAt = now.AddDays(-daysAgo), CreatedDate = now.AddDays(-daysAgo), Lines = lines,
            };
        }
    }
}
