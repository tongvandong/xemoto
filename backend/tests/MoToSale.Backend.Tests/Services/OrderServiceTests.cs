using MoToSale.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Services.Ordering;

namespace MoToSale.Backend.Tests.Services;

public class OrderServiceTests
{
    [Fact]
    public async Task CheckoutStatusAndCancel_CreateHistoryAndReleaseReservation()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 3);
        var service = f.OrderService();

        await service.AddItemAsync(userId: 2, new AddCartItemRequest(skuId, 1));

        var orderId = await service.CheckoutAsync(userId: 2, new CheckoutRequest(
            ShippingRecipient: "Customer",
            ShippingPhone: "0900000000",
            ShippingEmail: "customer@test.local",
            ShippingAddress: "Address",
            ReceivingMethod: "Delivery",
            OrderType: OrderType.FullPayment,
            ShippingFee: 0,
            DepositAmount: 0,
            Note: "E2E order",
            VoucherCode: null));

        var created = await service.GetOrderAsync(orderId);
        Assert.NotNull(created);
        Assert.Equal(OrderStatus.Pending, created.OrderStatus);
        Assert.Single(created.Lines);
        Assert.Single(f.Db.Reservations.Where(x => x.OrderId == orderId && x.ReservationStatus == ReservationStatus.Active));

        await service.UpdateStatusAsync(orderId, new UpdateOrderStatusRequest(OrderStatus.Shipping, "Ship"), userId: 1);
        var shipping = await service.GetOrderAsync(orderId);
        Assert.Equal(OrderStatus.Shipping, shipping!.OrderStatus);
        Assert.Equal(FulfillmentStatus.Shipped, shipping.FulfillmentStatus);

        await service.CancelOrderAsync(orderId, "Cancel for test", userId: 1);
        var cancelled = await service.GetOrderAsync(orderId);

        Assert.Equal(OrderStatus.Cancelled, cancelled!.OrderStatus);
        Assert.All(f.Db.Reservations.Where(x => x.OrderId == orderId), x => Assert.Equal(ReservationStatus.Released, x.ReservationStatus));
        Assert.True(cancelled.Histories.Count() >= 4);
    }

    [Fact]
    public async Task AddItem_RejectsQuantityAboveAvailableStock()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var skuId = await f.SeedSellableSkuAsync(onHand: 1);
        var service = f.OrderService();

        await Assert.ThrowsAsync<OrderException>(() => service.AddItemAsync(userId: 2, new AddCartItemRequest(skuId, 2)));
    }
}
