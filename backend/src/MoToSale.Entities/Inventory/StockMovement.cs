using MoToSale.Common;

namespace MoToSale.Entities.Inventory;

/// <summary>Sổ cái tồn kho — bất biến (append-only). OnHand luôn = tổng QtyDelta ảnh hưởng.</summary>
public class StockMovement : BaseEntity
{
    public int SkuId { get; set; }
    public int Type { get; set; }            // StockMovementType
    public int QtyDelta { get; set; }
    public int BalanceAfter { get; set; }
    public string? RefType { get; set; }     // "StockDocument" | "Order" ...
    public int? RefId { get; set; }
    public string? Reason { get; set; }
    public int? PerformedBy { get; set; }
    public DateTime OccurredAt { get; set; }
}
