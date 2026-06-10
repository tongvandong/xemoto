using MoToSale.DTO.Operations;

namespace MoToSale.Services.Operations;

public interface IInstallmentService
{
    Task<int> CreateAsync(CreateInstallmentApplicationRequest r, int? userId);
    Task<List<InstallmentApplicationDto>> GetAllAsync(string? status);
    Task<int> ApproveAsync(int id, ApproveInstallmentApplicationRequest r, int? userId);
    Task RejectAsync(int id, string? note, int? userId);
}

public class InstallmentException : Exception
{
    public InstallmentException(string message) : base(message) { }
}
