namespace MoToSale.DTO.Payments;

public record CreatePaymentRequest(int OrderId, string PaymentType, decimal Amount, string Method, string? TransactionRef, string? Note);

public record PaymentDto(
    int Id, string Code, int OrderId, string PaymentType, decimal Amount, string Method,
    string Status, string? TransactionRef, DateTime? PaidAt);

public record PaymentListItem(
    int Id, string Code, int OrderId, string? OrderCode, string PaymentType, decimal Amount,
    string Method, string Status, DateTime? PaidAt, DateTime CreatedDate);

public record CancelPaymentRequest(string? Reason);
