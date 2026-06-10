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
