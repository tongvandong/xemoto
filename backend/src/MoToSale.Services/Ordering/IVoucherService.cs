using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;

namespace MoToSale.Services.Ordering;

public interface IVoucherService
{
    Task<PagingResponse<VoucherDto>> SearchAsync(VoucherSearchRequest request);
    Task<List<VoucherDto>> GetAvailableAsync();
    Task<VoucherDto?> GetAsync(int id);
    Task<int> CreateAsync(SaveVoucherRequest request);
    Task UpdateAsync(int id, SaveVoucherRequest request);
    Task DeleteAsync(int id);
    Task<VoucherValidationResult> ValidateAsync(string code, decimal subtotal);
}

public class VoucherException : Exception
{
    public VoucherException(string message) : base(message) { }
}
