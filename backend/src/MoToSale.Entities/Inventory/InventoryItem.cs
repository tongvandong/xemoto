using MoToSale.Common;

namespace MoToSale.Entities.Inventory;

/// <summary>Tồn kho theo (cửa hàng × SKU). Available = OnHand - Reserved (tính, không lưu).</summary>
public class InventoryItem : BaseEntity
{
    public int SkuId { get; set; }
    public int OnHand { get; set; }
    public int Reserved { get; set; }
    public int ReorderPoint { get; set; } = 5;

    public int Available => OnHand - Reserved;
}
