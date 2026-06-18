using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Reports;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Payments;
using MoToSale.Repository;

namespace MoToSale.Services.Reports;
public partial class ReportService
{
    private async Task<ServiceReportDto> BuildServiceReportAsync(DateTime? start, DateTime? end)
    {
        var repairs = _db.RepairOrders.AsNoTracking().AsQueryable();
        var warranties = _db.Warranties.AsNoTracking().AsQueryable();

        if (start.HasValue)
        {
            repairs = repairs.Where(repair => repair.CreatedDate >= start.Value);
            warranties = warranties.Where(warranty => warranty.CreatedDate >= start.Value);
        }

        if (end.HasValue)
        {
            repairs = repairs.Where(repair => repair.CreatedDate <= end.Value);
            warranties = warranties.Where(warranty => warranty.CreatedDate <= end.Value);
        }

        List<RepairReportDto> repairRows = await repairs
            .OrderByDescending(repair => repair.CreatedDate)
            .Select(repair => new RepairReportDto(
                repair.Id,
                repair.Code,
                repair.VehicleDescription,
                repair.ReportedIssue,
                repair.RepairStatus,
                repair.LaborCost + repair.PartsCost,
                repair.ReceivedAt,
                repair.CompletedAt))
            .ToListAsync();

        List<WarrantyReportDto> warrantyRows = await warranties
            .OrderByDescending(warranty => warranty.CreatedDate)
            .Select(warranty => new WarrantyReportDto(
                warranty.Id,
                warranty.Code,
                warranty.ProductSnapshot,
                warranty.CustomerName,
                warranty.WarrantyStatus,
                warranty.StartAt,
                warranty.StartAt.AddMonths(warranty.Months),
                warranty.CreatedDate))
            .ToListAsync();

        return new ServiceReportDto(repairRows, warrantyRows);
    }

    private async Task<List<ReceivableReportDto>> BuildReceivableReportAsync()
    {
        List<Order> orders = await _db.Orders.AsNoTracking().OrderByDescending(order => order.Id).ToListAsync();
        Dictionary<int, string> users = await _db.Users.AsNoTracking().ToDictionaryAsync(user => user.Id, user => user.FullName);

        Dictionary<int, decimal> paid = await _db.Payments.AsNoTracking()
            .Where(payment => payment.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .GroupBy(payment => payment.OrderId)
            .Select(group => new { OrderId = group.Key, Amount = group.Sum(payment => payment.Amount) })
            .ToDictionaryAsync(row => row.OrderId, row => row.Amount);

        Dictionary<int, decimal> refunded = await _db.Refunds.AsNoTracking()
            .Where(refund => refund.RefundStatus == "Paid")
            .GroupBy(refund => refund.OrderId)
            .Select(group => new { OrderId = group.Key, Amount = group.Sum(refund => refund.Amount) })
            .ToDictionaryAsync(row => row.OrderId, row => row.Amount);

        return orders
            .Where(order => order.OrderStatus != OrderStatus.Cancelled)
            .Where(order => order.OrderType != OrderType.Installment)
            .Where(order => order.PaymentStatus != PaymentStatus.Paid)
            .Where(order => order.PaymentStatus != PaymentStatus.Refunded)
            .Select(order =>
            {
                decimal totalPaid = paid.GetValueOrDefault(order.Id);
                decimal totalRefunded = refunded.GetValueOrDefault(order.Id);
                decimal outstanding = Math.Max(0, order.RemainingAmount);
                string customerName = users.GetValueOrDefault(order.UserId) ?? order.ShippingRecipient;

                return new ReceivableReportDto(order.Id, order.Code, customerName, order.GrandTotal, totalPaid, totalRefunded, outstanding, order.PaymentStatus);
            })
            .Where(row => row.Outstanding > 0)
            .ToList();
    }

    private async Task<List<CrmTaskDto>> BuildCrmTasksAsync(DateTime now)
    {
        return await (from interaction in _db.CustomerInteractions.AsNoTracking()
                      join customer in _db.Users.AsNoTracking() on interaction.CustomerId equals customer.Id
                      join staffUser in _db.Users.AsNoTracking() on interaction.AssignedStaffId equals staffUser.Id into staffRows
                      from staff in staffRows.DefaultIfEmpty()
                      where interaction.InteractionStatus == "Open"
                      orderby interaction.FollowUpAt ?? interaction.CreatedDate
                      select new CrmTaskDto(
                          interaction.Id,
                          interaction.CustomerId,
                          customer.FullName,
                          staff == null ? null : staff.FullName,
                          interaction.InteractionType,
                          interaction.Subject,
                          interaction.FollowUpAt,
                          interaction.FollowUpAt.HasValue && interaction.FollowUpAt.Value < now))
            .Take(20)
            .ToListAsync();
    }

    private static DateTime GetReportStartDate(DateTime? startDate)
    {
        DateTime businessDate = (startDate ?? GetBusinessToday().AddDays(-29)).Date;
        return GetBusinessDayStartUtc(businessDate);
    }

    private static DateTime GetReportEndDate(DateTime? endDate)
    {
        DateTime businessDate = (endDate ?? GetBusinessToday()).Date;
        return GetBusinessDayEndUtc(businessDate);
    }
}
