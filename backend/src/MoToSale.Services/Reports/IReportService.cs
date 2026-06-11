using MoToSale.DTO.Reports;

namespace MoToSale.Services.Reports;

public interface IReportService
{
    Task<ReportResponse> GetSummaryAsync();

    Task<ReportResponse> GetDashboardAsync();

    Task<ReportResponse> GetReportAsync(DateTime? startDate, DateTime? endDate, int top);
}

public class ReportException : Exception
{
    public ReportException(string message) : base(message)
    {
    }
}
