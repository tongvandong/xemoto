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
