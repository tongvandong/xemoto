using MoToSale.DTO.Operations;

namespace MoToSale.Services.Operations;

public interface IInstallmentService
{
    Task<int> CreateAsync(CreateInstallmentApplicationRequest r, int? userId);
    Task<List<InstallmentApplicationDto>> GetAllAsync(string? status);
    Task<List<InstallmentApplicationDto>> GetMineAsync(int userId);
    Task<InstallmentApplicationDto?> GetByIdAsync(int id, int? userId, bool isStaff);
    Task<int> ApproveAsync(int id, ApproveInstallmentApplicationRequest r, int? userId);
    Task RejectAsync(int id, string? note, int? userId);
    Task UpdateAsync(int id, UpdateInstallmentApplicationRequest r, int? userId);
    Task CancelOwnAsync(int id, int? userId);
}

public class InstallmentException : Exception
{
    public InstallmentException(string message) : base(message) { }
}
