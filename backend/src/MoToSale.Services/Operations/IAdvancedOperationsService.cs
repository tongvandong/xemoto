using MoToSale.DTO.Operations;

namespace MoToSale.Services.Operations;

public interface IAdvancedOperationsService
{
    Task<List<SalesReturnDto>> GetReturnsAsync(string? status);
    Task<SalesReturnDto?> GetReturnAsync(int id);
    Task<int> CreateReturnAsync(CreateSalesReturnRequest request, int? userId);
    Task UpdateReturnAsync(int id, UpdateSalesReturnRequest request, int? userId);
    Task ApproveReturnAsync(int id, ApproveSalesReturnRequest request, int? userId);
    Task RejectReturnAsync(int id, string? note, int? userId);
    Task<List<RefundDto>> GetRefundsAsync(int? orderId);
    Task<List<OrderReceivableDto>> GetReceivablesAsync();
}

public class AdvancedOperationsException : Exception
{
    public AdvancedOperationsException(string message) : base(message) { }
}
