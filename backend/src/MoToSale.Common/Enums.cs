namespace MoToSale.Common;

/// <summary>Các enum dùng chung toàn hệ thống (theo khuôn BaseCore.Common.Enums).</summary>
public enum ProductKind
{
    Motorcycle = 1,
    Part = 2,
}

/// <summary>Loại biến động tồn kho trong sổ cái.</summary>
public enum StockMovementType
{
    Receipt = 1,      // Nhập kho
    Issue = 2,        // Xuất bán
    AdjustIn = 3,     // Điều chỉnh tăng
    AdjustOut = 4,    // Điều chỉnh giảm
    TransferOut = 5,  // Chuyển ra
    TransferIn = 6,   // Chuyển vào
    ReserveHold = 7,  // Giữ chỗ
    ReserveRelease = 8, // Nhả giữ chỗ
}

/// <summary>Loại phiếu kho.</summary>
public enum StockDocumentType
{
    Receipt = 1,
    Issue = 2,
    Adjustment = 3,
    Stocktake = 4,
    Transfer = 5,
}

public static class StockDocumentStatus
{
    public const string Draft = "Draft";
    public const string Approved = "Approved";
    public const string Cancelled = "Cancelled";
}

public static class ReservationStatus
{
    public const string Active = "Active";
    public const string Confirmed = "Confirmed";
    public const string Released = "Released";
    public const string Expired = "Expired";
}

// Truc 1: vong doi giao/nhan hang, doc lap voi thanh toan.
public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Shipping = "Shipping";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";
}

// Truc 2: vong doi thanh toan, doc lap voi giao hang.
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

public static class PaymentRecordType
{
    public const string Deposit = "Deposit";
    public const string Full = "Full";
    public const string Remaining = "Remaining";
    public const string Installment = "Installment";
}

/// <summary>Manual or system-recorded payment method.</summary>
public static class PaymentMethod
{
    public const string Cash = "Cash";
    public const string BankTransfer = "BankTransfer";
    public const string COD = "COD";
    public const string Card = "Card";
}

public static class PaymentRecordStatus
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Cancelled = "Cancelled";
}
