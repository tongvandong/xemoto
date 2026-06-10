using MoToSale.Common;

namespace MoToSale.Entities.Inventory;

public class StockDocument : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int Type { get; set; }                 // StockDocumentType
    public string DocStatus { get; set; } = StockDocumentStatus.Draft;
    public string? Note { get; set; }
    public int? CreatedBy { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public ICollection<StockDocumentLine> Lines { get; set; } = new List<StockDocumentLine>();
}
