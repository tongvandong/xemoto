using MoToSale.Common;

namespace MoToSale.Entities.Inventory;

public class StockDocumentLine : BaseEntity
{
    public int StockDocumentId { get; set; }
    public int SkuId { get; set; }
    public int Qty { get; set; }
    public string? Note { get; set; }

    public StockDocument StockDocument { get; set; } = null!;
}
