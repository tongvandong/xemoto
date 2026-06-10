using MoToSale.Common;

namespace MoToSale.Entities.Operations;

public class Supplier : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Note { get; set; }
}

public class PurchaseOrder : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public string PurchaseStatus { get; set; } = "Draft";
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Note { get; set; }
    public int? CreatedBy { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
}

public class PurchaseOrderLine : BaseEntity
{
    public int PurchaseOrderId { get; set; }
    public int SkuId { get; set; }
    public int OrderedQty { get; set; }
    public int ReceivedQty { get; set; }
    public decimal UnitCost { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
}

public class GoodsReceipt : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int PurchaseOrderId { get; set; }
    public string? Note { get; set; }
    public int? ReceivedBy { get; set; }
    public DateTime ReceivedAt { get; set; }
    public ICollection<GoodsReceiptLine> Lines { get; set; } = new List<GoodsReceiptLine>();
}

public class GoodsReceiptLine : BaseEntity
{
    public int GoodsReceiptId { get; set; }
    public int PurchaseOrderLineId { get; set; }
    public int SkuId { get; set; }
    public int Qty { get; set; }
    public decimal UnitCost { get; set; }
    public GoodsReceipt GoodsReceipt { get; set; } = null!;
}

public class CashTransaction : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string TransactionType { get; set; } = "Receipt";
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public string? Note { get; set; }
    public int? RecordedBy { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class RepairOrder : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public int? AssignedStaffId { get; set; }
    public int? WarrantyId { get; set; }
    public string VehicleDescription { get; set; } = string.Empty;
    public string ReportedIssue { get; set; } = string.Empty;
    public string RepairStatus { get; set; } = "Received";
    public decimal LaborCost { get; set; }
    public decimal PartsCost { get; set; }
    public string? Note { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool PartsIssued { get; set; }
    public ICollection<RepairOrderLine> Lines { get; set; } = new List<RepairOrderLine>();
}

public class RepairOrderLine : BaseEntity
{
    public int RepairOrderId { get; set; }
    public int? SkuId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public RepairOrder RepairOrder { get; set; } = null!;
}

public class CustomerInteraction : BaseEntity
{
    public int CustomerId { get; set; }
    public int? AssignedStaffId { get; set; }
    public string InteractionType { get; set; } = "Call";
    public string InteractionStatus { get; set; } = "Open";
    public string Subject { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime? FollowUpAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class RepairStatusHistory : BaseEntity
{
    public int RepairOrderId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime ChangedAt { get; set; }
}

public class StaffAttendance : BaseEntity
{
    public int StaffUserId { get; set; }
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public string? Note { get; set; }
}
