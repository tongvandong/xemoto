using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Payments;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Payments;

public class PaymentRepository : Repository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagingResponse<PaymentListItem>> SearchAsync(PagingRequest request, string? status)
    {
        var query =
            from payment in Set.AsNoTracking()
            join order in Context.Orders.AsNoTracking() on payment.OrderId equals order.Id into orders
            from order in orders.DefaultIfEmpty()
            select new
            {
                Payment = payment,
                OrderCode = order.Code
            };

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(row => row.Payment.PaymentRecordStatus == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword;
            query = query.Where(row =>
                row.Payment.Code.Contains(keyword)
                || (row.OrderCode != null && row.OrderCode.Contains(keyword)));
        }

        int totalItems = await query.CountAsync();

        List<PaymentListItem> items = await query
            .OrderByDescending(row => row.Payment.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(row => new PaymentListItem(
                row.Payment.Id,
                row.Payment.Code,
                row.Payment.OrderId,
                row.OrderCode,
                row.Payment.PaymentType,
                row.Payment.Amount,
                row.Payment.Method,
                row.Payment.PaymentRecordStatus,
                row.Payment.PaidAt,
                row.Payment.CreatedDate))
            .ToListAsync();

        return new PagingResponse<PaymentListItem>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<List<Payment>> GetByOrderAsync(int orderId)
    {
        List<Payment> payments = await Set
            .AsNoTracking()
            .Where(payment => payment.OrderId == orderId)
            .OrderByDescending(payment => payment.Id)
            .ToListAsync();

        return payments;
    }

    public async Task<decimal> GetTotalPaidAsync(int orderId)
    {
        decimal? totalPaid = await Set
            .Where(payment =>
                payment.OrderId == orderId
                && payment.PaymentRecordStatus == PaymentRecordStatus.Paid)
            .SumAsync(payment => (decimal?)payment.Amount);

        return totalPaid ?? 0m;
    }
}
