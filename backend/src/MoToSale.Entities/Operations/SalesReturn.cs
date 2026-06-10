using MoToSale.Common;

namespace MoToSale.Entities.Operations;

public class SalesReturn : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string ReturnStatus { get; set; } = "Draft";
    public string Reason { get; set; } = string.Empty;
    public string? Note { get; set; }
    public decimal RefundAmount { get; set; }
    public int? CreatedBy { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public ICollection<SalesReturnLine> Lines { get; set; } = new List<SalesReturnLine>();
}

public class SalesReturnLine : BaseEntity
{
    public int SalesReturnId { get; set; }
    public int OrderLineId { get; set; }
    public int SkuId { get; set; }
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string ItemCondition { get; set; } = "Resellable";
    public SalesReturn SalesReturn { get; set; } = null!;
}

public class Refund : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public int? SalesReturnId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";
    public string RefundStatus { get; set; } = "Paid";
    public string? Reason { get; set; }
    public string? TransactionRef { get; set; }
    public int? RecordedBy { get; set; }
    public DateTime RefundedAt { get; set; }
}
