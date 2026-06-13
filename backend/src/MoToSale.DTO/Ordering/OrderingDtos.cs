using MoToSale.DTO.Common;

namespace MoToSale.DTO.Ordering;

// ===== Cart =====
public record AddCartItemRequest(int SkuId, int Qty);
public record UpdateCartItemRequest(int Qty);
public record CartItemDto(int Id, int ProductId, int SkuId, string SkuCode, string ProductName, int Qty, decimal UnitPrice, decimal LineTotal, string? ImageUrl);
public record CartDto(int Id, IEnumerable<CartItemDto> Items, int TotalItems, decimal Subtotal);

// ===== Checkout / Order =====
public record CheckoutRequest(
    string ShippingRecipient, string ShippingPhone, string? ShippingEmail, string? ShippingAddress,
    string ReceivingMethod, string OrderType, decimal ShippingFee, decimal DepositAmount, string? Note,
    string? PaymentMethod = null, string? VoucherCode = null, string? FulfillmentNote = null, DateTime? PickupAppointmentAt = null);

public record OrderLineDto(int Id, int ProductId, int SkuId, string ProductName, string SkuCode, decimal UnitPrice, int Qty, decimal LineTotal, IEnumerable<AllocationDto> Allocations);
public record AllocationDto(int Id, int Qty, string Status);
public record OrderHistoryDto(int Id, string EventType, string? OldValue, string NewValue, string? Note, int? ActorUserId, DateTime CreatedAt);
public record OrderPaymentDto(int Id, string Code, string PaymentType, decimal Amount, string Method, string Status, string? TransactionRef, DateTime? PaidAt);
// ProductId để storefront tra trạng thái đánh giá sản phẩm ngay từ danh sách đơn (không cần mở chi tiết).
public record OrderLineSummaryDto(int SkuId, string ProductName, string SkuCode, decimal UnitPrice, int Qty, decimal LineTotal, int ProductId = 0);

public record OrderListItem(
    int Id, string Code, string OrderStatus, string PaymentStatus, string FulfillmentStatus,
    decimal GrandTotal, DateTime? PlacedAt, int UserId, string? CustomerName, IEnumerable<OrderLineSummaryDto> Lines);

public record OrderDetail(
    int Id, string Code, int UserId, string OrderType, string OrderStatus, string PaymentMethod, string PaymentStatus, string FulfillmentStatus,
    decimal Subtotal, decimal DiscountTotal, decimal ShippingFee, decimal GrandTotal, decimal DepositAmount, decimal RemainingAmount,
    string ShippingRecipient, string ShippingPhone, string? ShippingEmail, string? ShippingAddress, string ReceivingMethod,
    string? Note, string? FulfillmentNote, DateTime? PickupAppointmentAt, DateTime? PlacedAt, string? CustomerName, IEnumerable<OrderLineDto> Lines,
    IEnumerable<OrderHistoryDto> Histories, IEnumerable<OrderPaymentDto> Payments);

public class OrderSearchRequest : PagingRequest
{
    public string? OrderStatus { get; set; }
    public string? PaymentStatus { get; set; }
    public string? FulfillmentStatus { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

// ===== Allocation (admin phân phối) =====
public record AllocateLineRequest(int OrderLineId, int Qty);
public record AllocateRequest(List<AllocateLineRequest> Allocations);
public record AllocationSuggestionItem(int OrderLineId, int SkuId, string ProductName, int Qty, int Available);

public record UpdateOrderStatusRequest(string ToStatus, string? Note);
public record UpdateFulfillmentStatusRequest(string ToStatus, string? Note);
public record CancelOrderRequest(string? Reason);

// Sửa đơn: thông tin giao/khách + ghi chú (luôn cho sửa khi đơn chưa hoàn tất/hủy);
// Lines chỉ áp dụng khi đơn đang Chờ thanh toán (chưa thu tiền, chưa xuất kho).
public record UpdateOrderRequest(
    string? ShippingRecipient, string? ShippingPhone, string? ShippingEmail, string? ShippingAddress,
    string? Note, string? FulfillmentNote = null, DateTime? PickupAppointmentAt = null, List<PosOrderLineRequest>? Lines = null);

// ===== Bán tại quầy (POS) =====
public record PosOrderLineRequest(int SkuId, int Qty, decimal? UnitPrice = null);
public record PosOrderRequest(
    int? CustomerId, string? CustomerName, string? CustomerPhone, string? Note,
    string OrderType, decimal DepositAmount, string? VoucherCode,
    string PaymentMethod, decimal PaidAmount, List<PosOrderLineRequest> Lines);

// ===== Voucher =====
public record VoucherDto(
    int Id, string Code, string? Description, string DiscountType, decimal DiscountValue,
    decimal? MaxDiscount, decimal MinOrderValue, int? UsageLimit, int? PerUserLimit, int UsedCount,
    DateTime? StartAt, DateTime? EndAt, int Status);

public record SaveVoucherRequest(
    string Code, string? Description, string DiscountType, decimal DiscountValue,
    decimal? MaxDiscount, decimal MinOrderValue, int? UsageLimit, int? PerUserLimit,
    DateTime? StartAt, DateTime? EndAt, int Status);

public record VoucherValidationResult(bool Valid, string? Message, decimal DiscountAmount, VoucherDto? Voucher);

// ===== Bảo hành =====
public record WarrantyDto(int Id, string Code, int? OrderId, int? SkuId, int? CustomerId, string ProductSnapshot, string? SerialNumber, string? CustomerName, string? CustomerPhone, string? FrameNumber, string? EngineNumber, string ReportedIssue, decimal? EstimatedCost, decimal? ActualCost, DateTime ReceivedAt, DateTime? CompletedAt, DateTime StartAt, int Months, string WarrantyStatus, string? Note, DateTime CreatedDate);
public record WarrantyHistoryDto(int Id, string? FromStatus, string ToStatus, string? Note, decimal? ActualCost, int? ChangedBy, DateTime CreatedDate);
public record WarrantyDetailDto(WarrantyDto Warranty, IEnumerable<WarrantyHistoryDto> Histories);
public record SaveWarrantyRequest(int? OrderId, int? SkuId, int? CustomerId, string ProductSnapshot, string? SerialNumber, DateTime? StartAt, int Months, string? Note, string? CustomerName = null, string? CustomerPhone = null, string? FrameNumber = null, string? EngineNumber = null, string? ReportedIssue = null, decimal? EstimatedCost = null);
public record UpdateWarrantyStatusRequest(string Status, string? Note = null, decimal? ActualCost = null);

public class PaymentClaimResponse
{
    public int Id { get; set; }

    public string Status { get; set; } = string.Empty;
}
