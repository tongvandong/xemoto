namespace MoToSale.DTO.Customers;

public record CustomerProfileDto(
    int Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    string? CareNote,
    DateTime CreatedDate,
    int Status);

public record CustomerProfileOrderDto(
    int Id,
    string Code,
    string OrderStatus,
    string PaymentStatus,
    string FulfillmentStatus,
    decimal GrandTotal,
    decimal RemainingAmount,
    DateTime? PlacedAt,
    DateTime CreatedDate);

public record CustomerProfileWarrantyDto(
    int Id,
    string Code,
    string ProductSnapshot,
    string? SerialNumber,
    string WarrantyStatus,
    DateTime StartAt,
    int Months,
    DateTime ReceivedAt,
    DateTime? CompletedAt,
    string? Note);

public record CustomerProfileRepairDto(
    int Id,
    string Code,
    string VehicleDescription,
    string ReportedIssue,
    string RepairStatus,
    decimal Total,
    DateTime ReceivedAt,
    DateTime? CompletedAt,
    string? Note);

public record CustomerProfileInteractionDto(
    int Id,
    string InteractionType,
    string InteractionStatus,
    string Subject,
    string? Note,
    DateTime? FollowUpAt,
    DateTime? CompletedAt,
    DateTime CreatedDate);

public record CustomerTimelineItemDto(string Type, string Title, string Status, string? Note, DateTime Date);

public record CustomerProfileSummaryDto(
    int OrderCount,
    decimal OrderTotal,
    decimal RemainingTotal,
    int WarrantyCount,
    int RepairCount,
    int OpenCrmCount);

public record CustomerProfileResponse(
    CustomerProfileDto Customer,
    CustomerProfileSummaryDto Summary,
    IReadOnlyList<CustomerProfileOrderDto> Orders,
    IReadOnlyList<CustomerProfileWarrantyDto> Warranties,
    IReadOnlyList<CustomerProfileRepairDto> Repairs,
    IReadOnlyList<CustomerProfileInteractionDto> Interactions,
    IReadOnlyList<CustomerTimelineItemDto> Timeline);
