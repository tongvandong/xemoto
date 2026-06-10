using MoToSale.DTO.Operations;

namespace MoToSale.Services.Operations;

public interface IBusinessOperationsService
{
    Task<object> GetLookupsAsync();
    Task<object> GetSuppliersAsync();
    Task<int> SaveSupplierAsync(int? id, SupplierRequest request);
    Task<object> GetPurchaseOrdersAsync();
    Task<int> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, int? userId);
    Task ApprovePurchaseOrderAsync(int id, int? userId);
    Task CancelPurchaseOrderAsync(int id);
    Task<int> ReceivePurchaseOrderAsync(int id, ReceivePurchaseOrderRequest request, int? userId);
    Task<int> PayPurchaseOrderAsync(int id, PayPurchaseOrderRequest request, int? userId);
    Task<object> GetCashTransactionsAsync();
    Task<int> CreateCashTransactionAsync(CashTransactionRequest request, int? userId);
    Task<int> ReverseCashTransactionAsync(int id, int? userId);
    Task<object> GetRepairsAsync();
    Task<int> CreateRepairAsync(CreateRepairOrderRequest request);
    Task UpdateRepairAsync(int id, CreateRepairOrderRequest request);
    Task UpdateRepairStatusAsync(int id, UpdateRepairStatusRequest request);
    Task<object> GetInteractionsAsync();
    Task<int> CreateInteractionAsync(CustomerInteractionRequest request);
    Task UpdateInteractionAsync(int id, CustomerInteractionRequest request);
    Task CompleteInteractionAsync(int id);
    Task CancelInteractionAsync(int id);
    Task<object> GetAttendanceAsync();
    Task<int> CheckInAsync(AttendanceRequest request);
    Task CheckOutAsync(int id);
    Task<object> GetSummaryAsync(bool includeFinancials);
}

public class BusinessOperationsException : Exception
{
    public BusinessOperationsException(string message) : base(message) { }
}
