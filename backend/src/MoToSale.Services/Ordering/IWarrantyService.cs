using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;

namespace MoToSale.Services.Ordering;

public interface IWarrantyService
{
    Task<PagingResponse<WarrantyDto>> SearchAsync(PagingRequest request, string? status);
    Task<WarrantyDetailDto?> GetAsync(int id);
    Task<int> CreateAsync(SaveWarrantyRequest request);
    Task UpdateAsync(int id, SaveWarrantyRequest request);
    Task UpdateStatusAsync(int id, UpdateWarrantyStatusRequest request, int? userId);
}

public class WarrantyException : Exception
{
    public WarrantyException(string message) : base(message) { }
}
