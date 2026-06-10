using MoToSale.Common;

namespace MoToSale.Entities.Inventory;

/// <summary>Giữ chỗ tồn kho theo SKU.</summary>
public class Reservation : BaseEntity
{
    public int OrderId { get; set; }
    public int OrderLineId { get; set; }
    public int SkuId { get; set; }
    public int Qty { get; set; }
    public string ReservationStatus { get; set; } = Common.ReservationStatus.Active;
    public DateTime ExpiresAt { get; set; }
}
