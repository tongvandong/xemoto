namespace MoToSale.Common;

// Trục 1 — vòng đời giao/nhận hàng (độc lập với thanh toán).
public static class OrderStatus
{
    public const string Pending = "Pending";      // Chờ xác nhận
    public const string Shipping = "Shipping";    // Đang giao (chuẩn bị/xuất kho/giao/hẹn lấy)
    public const string Delivered = "Delivered";  // Đã giao = hoàn tất bán hàng
    public const string Cancelled = "Cancelled";  // Đã hủy
}

// Trục 2 — vòng đời thanh toán (độc lập với giao hàng).
public static class PaymentStatus
{
    public const string Unpaid = "Unpaid";                            // Chờ thanh toán (gồm cả đơn mới đặt cọc)
    public const string PendingConfirmation = "PendingConfirmation";  // Chờ xác nhận chuyển khoản
    public const string Paid = "Paid";                                // Đã thanh toán (đủ)
    public const string Refunded = "Refunded";                        // Đã hoàn tiền
    public const string Failed = "Failed";                            // Thanh toán thất bại
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
