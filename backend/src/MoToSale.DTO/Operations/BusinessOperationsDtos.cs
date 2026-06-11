namespace MoToSale.DTO.Operations;

public record SupplierRequest(string Code, string Name, string? TaxCode, string? ContactName, string? Phone, string? Email, string? Address, string? Note, int Status = 1);
public record PurchaseLineRequest(int SkuId, int Qty, decimal UnitCost);
public record CreatePurchaseOrderRequest(int SupplierId, string? Note, List<PurchaseLineRequest> Lines);
public record ReceivePurchaseLineRequest(int PurchaseOrderLineId, int Qty);
public record ReceivePurchaseOrderRequest(string? Note, List<ReceivePurchaseLineRequest> Lines);
public record PayPurchaseOrderRequest(decimal Amount, string Method, string? Note);
public record CashTransactionRequest(string TransactionType, string Category, decimal Amount, string Method, string? ReferenceType, int? ReferenceId, string? Note, DateTime? OccurredAt);
public record RepairLineRequest(int? SkuId, string Description, int Qty, decimal UnitPrice);
public record CreateRepairOrderRequest(int CustomerId, int? AssignedStaffId, int? WarrantyId, string VehicleDescription, string ReportedIssue, decimal LaborCost, string? Note, List<RepairLineRequest>? Lines);
public record UpdateRepairStatusRequest(string Status, string? Note);
public record CustomerInteractionRequest(int CustomerId, int? AssignedStaffId, string InteractionType, string Subject, string? Note, DateTime? FollowUpAt);
public record AttendanceRequest(int StaffUserId, string? Note);

public class BusinessLookupResponse
{
    public List<LookupSkuDto> Skus { get; set; } = new List<LookupSkuDto>();
    public List<LookupSupplierDto> Suppliers { get; set; } = new List<LookupSupplierDto>();
    public List<LookupUserDto> Customers { get; set; } = new List<LookupUserDto>();
    public List<LookupUserDto> Staff { get; set; } = new List<LookupUserDto>();
    public List<LookupOrderDto> Orders { get; set; } = new List<LookupOrderDto>();
}

public class LookupSkuDto
{
    public int Id { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string ProductName { get; set; } = string.Empty;
}

public class LookupSupplierDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class LookupUserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
}

public class LookupOrderDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int UserId { get; set; }
    public decimal GrandTotal { get; set; }
    public List<LookupOrderLineDto> Lines { get; set; } = new List<LookupOrderLineDto>();
}

public class LookupOrderLineDto
{
    public int Id { get; set; }
    public int SkuId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string SkuCodeSnapshot { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
}

public class SupplierDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Note { get; set; }
    public int Status { get; set; }
}

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string PurchaseStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal Outstanding { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedDate { get; set; }
    public List<PurchaseOrderLineDto> Lines { get; set; } = new List<PurchaseOrderLineDto>();
}

public class PurchaseOrderLineDto
{
    public int Id { get; set; }
    public int SkuId { get; set; }
    public string? SkuCode { get; set; }
    public string? ProductName { get; set; }
    public int OrderedQty { get; set; }
    public int ReceivedQty { get; set; }
    public decimal UnitCost { get; set; }
}

public class CashTransactionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public string? Note { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class RepairOrderDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int? AssignedStaffId { get; set; }
    public string VehicleDescription { get; set; } = string.Empty;
    public string ReportedIssue { get; set; } = string.Empty;
    public string RepairStatus { get; set; } = string.Empty;
    public decimal LaborCost { get; set; }
    public decimal PartsCost { get; set; }
    public decimal Total { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Note { get; set; }
    public List<RepairOrderLineDto> Lines { get; set; } = new List<RepairOrderLineDto>();
    public List<RepairHistoryDto> Histories { get; set; } = new List<RepairHistoryDto>();
}

public class RepairOrderLineDto
{
    public int Id { get; set; }
    public int? SkuId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
}

public class RepairHistoryDto
{
    public int Id { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime ChangedAt { get; set; }
}

public class CustomerInteractionDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int? AssignedStaffId { get; set; }
    public string? StaffName { get; set; }
    public string InteractionType { get; set; } = string.Empty;
    public string InteractionStatus { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime? FollowUpAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class StaffAttendanceDto
{
    public int Id { get; set; }
    public int StaffUserId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public string? Note { get; set; }
}

public class BusinessSummaryDto
{
    public int Suppliers { get; set; }
    public int PendingPurchases { get; set; }
    public decimal PurchaseValue { get; set; }
    public decimal CashIn { get; set; }
    public decimal CashOut { get; set; }
    public int OpenRepairs { get; set; }
    public int OpenInteractions { get; set; }
}
