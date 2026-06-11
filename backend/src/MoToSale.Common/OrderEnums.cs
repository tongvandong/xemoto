namespace MoToSale.Common;

// Trục 1: vòng đời giao/nhận hàng, độc lập với thanh toán.
public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Shipping = "Shipping";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";
}

// Trục 2: vòng đời thanh toán, độc lập với giao hàng.
public static class PaymentStatus
{
    public const string Unpaid = "Unpaid";
    public const string PendingConfirmation = "PendingConfirmation";
    public const string Paid = "Paid";
    public const string Refunded = "Refunded";
    public const string Failed = "Failed";
}

public static class FulfillmentStatus
{
    public const string Unallocated = "Unallocated";
    public const string Allocated = "Allocated";
    public const string Shipped = "Shipped";
    public const string Fulfilled = "Fulfilled";
}

public static class OrderType
{
    public const string FullPayment = "FullPayment";
    public const string Deposit = "Deposit";
    public const string Installment = "Installment";
}

public static class AllocationStatus
{
    public const string Planned = "Planned";
    public const string Picked = "Picked";
    public const string Shipped = "Shipped";
    public const string Fulfilled = "Fulfilled";
    public const string Cancelled = "Cancelled";
}
