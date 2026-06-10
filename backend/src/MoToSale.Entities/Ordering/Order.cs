using MoToSale.Common;

namespace MoToSale.Entities.Ordering;

public class Order : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string Channel { get; set; } = "Online";
    public string OrderType { get; set; } = Common.OrderType.FullPayment;
    public string OrderStatus { get; set; } = Common.OrderStatus.Pending;
    public string PaymentMethod { get; set; } = Common.PaymentMethod.COD;
    public string PaymentStatus { get; set; } = Common.PaymentStatus.Unpaid;
    public string FulfillmentStatus { get; set; } = Common.FulfillmentStatus.Unallocated;

    public int? VoucherId { get; set; } // voucher đã áp dụng (để hoàn lượt khi hủy + chặn theo PerUserLimit)

    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    public string ShippingRecipient { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string? ShippingEmail { get; set; }
    public string? ShippingAddress { get; set; }
    public string ReceivingMethod { get; set; } = "Delivery"; // Delivery | Pickup
    public string? Note { get; set; }
    public string? FulfillmentNote { get; set; }
    public DateTime? PickupAppointmentAt { get; set; }
    public DateTime? PlacedAt { get; set; }

    public ICollection<OrderLine> Lines { get; set; } = new List<OrderLine>();
}

public class OrderLine : BaseEntity
{
    public int OrderId { get; set; }
    public int SkuId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string SkuCodeSnapshot { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Qty { get; set; }
    public decimal LineTotal { get; set; }

    public Order Order { get; set; } = null!;
    public ICollection<Allocation> Allocations { get; set; } = new List<Allocation>();
}

public class Allocation : BaseEntity
{
    public int OrderLineId { get; set; }
    public int Qty { get; set; }
    public string AllocationStatus { get; set; } = Common.AllocationStatus.Planned;

    public OrderLine OrderLine { get; set; } = null!;
}

public class OrderStatusHistory : BaseEntity
{
    public int OrderId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Note { get; set; }
    public int? ChangedBy { get; set; }
}
