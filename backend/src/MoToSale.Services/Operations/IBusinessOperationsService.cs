using MoToSale.DTO.Operations;
using MoToSale.DTO.Common;

namespace MoToSale.Services.Operations;

public interface IBusinessOperationsService
{
    Task<BusinessLookupResponse> GetLookupsAsync();
    Task<ItemsResponse<SupplierDto>> GetSuppliersAsync();
    Task<int> SaveSupplierAsync(int? id, SupplierRequest request);
    Task<ItemsResponse<PurchaseOrderDto>> GetPurchaseOrdersAsync();
    Task<int> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, int? userId);
    Task UpdatePurchaseOrderAsync(int id, CreatePurchaseOrderRequest request, int? userId);
    Task ApprovePurchaseOrderAsync(int id, int? userId);
    Task CancelPurchaseOrderAsync(int id);
    Task<int> ReceivePurchaseOrderAsync(int id, ReceivePurchaseOrderRequest request, int? userId);
    Task<int> PayPurchaseOrderAsync(int id, PayPurchaseOrderRequest request, int? userId);
    Task<ItemsResponse<CashTransactionDto>> GetCashTransactionsAsync();
    Task<int> CreateCashTransactionAsync(CashTransactionRequest request, int? userId);
    Task<int> ReverseCashTransactionAsync(int id, int? userId);
    Task<ItemsResponse<RepairOrderDto>> GetRepairsAsync();
    Task<int> CreateRepairAsync(CreateRepairOrderRequest request);
    Task UpdateRepairAsync(int id, CreateRepairOrderRequest request);
    Task UpdateRepairStatusAsync(int id, UpdateRepairStatusRequest request);
    Task<ItemsResponse<CustomerInteractionDto>> GetInteractionsAsync();
    Task<int> CreateInteractionAsync(CustomerInteractionRequest request);
    Task UpdateInteractionAsync(int id, CustomerInteractionRequest request);
    Task CompleteInteractionAsync(int id);
    Task CancelInteractionAsync(int id);
    Task<ItemsResponse<StaffAttendanceDto>> GetAttendanceAsync();
    Task<int> CheckInAsync(AttendanceRequest request);
    Task<int> GetAttendanceStaffUserIdAsync(int id);
    Task CheckOutAsync(int id);
    Task<BusinessSummaryDto> GetSummaryAsync(bool includeFinancials);
}

public class BusinessOperationsException : Exception
{
    public BusinessOperationsException(string message) : base(message) { }
}
