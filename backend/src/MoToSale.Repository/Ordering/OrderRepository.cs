using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Order?> GetDetailAsync(int id)
    {
        Order? order = await Set
            .Include(item => item.Lines)
            .ThenInclude(line => line.Allocations)
            .FirstOrDefaultAsync(item => item.Id == id);

        return order;
    }

    public async Task<List<Order>> GetByUserAsync(int userId)
    {
        List<Order> orders = await Set
            .AsNoTracking()
            .Include(item => item.Lines)
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.Id)
            .ToListAsync();

        return orders;
    }

    public async Task<PagingResponse<Order>> SearchAsync(OrderSearchRequest request)
    {
        IQueryable<Order> query = Set
            .AsNoTracking()
            .Include(order => order.Lines)
            .AsQueryable();

        query = ApplyStatusFilters(query, request);
        query = ApplyDateFilters(query, request);
        query = ApplyKeywordFilter(query, request);

        int totalItems = await query.CountAsync();
        query = ApplySorting(query, request);

        List<Order> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagingResponse<Order>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public void AddStatusHistory(OrderStatusHistory history)
    {
        Context.OrderStatusHistories.Add(history);
    }

    public async Task<List<OrderStatusHistory>> GetHistoriesAsync(int orderId)
    {
        List<OrderStatusHistory> histories = await Context.OrderStatusHistories
            .AsNoTracking()
            .Where(history => history.OrderId == orderId)
            .OrderBy(history => history.CreatedDate)
            .ThenBy(history => history.Id)
            .ToListAsync();

        return histories;
    }

    private static IQueryable<Order> ApplyStatusFilters(IQueryable<Order> query, OrderSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.OrderStatus))
        {
            string orderStatus = NormalizeOrderStatusFilter(request.OrderStatus);
            query = query.Where(order => order.OrderStatus == orderStatus);
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentStatus))
        {
            query = query.Where(order => order.PaymentStatus == request.PaymentStatus);
        }

        if (!string.IsNullOrWhiteSpace(request.FulfillmentStatus))
        {
            query = query.Where(order => order.FulfillmentStatus == request.FulfillmentStatus);
        }

        return query;
    }

    private static string NormalizeOrderStatusFilter(string status)
    {
        return status switch
        {
            "Pending" or "AwaitingPayment" or "Checkout" or "Confirmed" => "Pending",
            "Preparing" or "Allocated" => "Preparing",
            "Shipping" => "Shipping",
            "Completed" or "Delivered" => "Delivered",
            "Cancelled" => "Cancelled",
            _ => status,
        };
    }

    private static IQueryable<Order> ApplyDateFilters(IQueryable<Order> query, OrderSearchRequest request)
    {
        if (request.StartDate.HasValue)
        {
            DateTime startDate = request.StartDate.Value.Date;
            query = query.Where(order => (order.PlacedAt ?? order.CreatedDate) >= startDate);
        }

        if (request.EndDate.HasValue)
        {
            DateTime endDate = request.EndDate.Value.Date.AddDays(1);
            query = query.Where(order => (order.PlacedAt ?? order.CreatedDate) < endDate);
        }

        return query;
    }

    private IQueryable<Order> ApplyKeywordFilter(IQueryable<Order> query, OrderSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Keyword))
        {
            return query;
        }

        string keyword = request.Keyword.Trim();

        query = query.Where(order =>
            order.Code.Contains(keyword)
            || order.ShippingRecipient.Contains(keyword)
            || order.ShippingPhone.Contains(keyword)
            || (order.ShippingEmail != null && order.ShippingEmail.Contains(keyword))
            || Context.Users.Any(user =>
                user.Id == order.UserId
                && (user.FullName.Contains(keyword)
                    || user.Email.Contains(keyword)
                    || (user.PhoneNumber != null && user.PhoneNumber.Contains(keyword)))));

        return query;
    }

    private static IQueryable<Order> ApplySorting(IQueryable<Order> query, OrderSearchRequest request)
    {
        string sortBy = string.IsNullOrWhiteSpace(request.SortBy)
            ? "id"
            : request.SortBy.Trim().ToLowerInvariant();

        bool descending = request.SortDescending;

        return sortBy switch
        {
            "code" => descending
                ? query.OrderByDescending(order => order.Code)
                : query.OrderBy(order => order.Code),
            "customer" or "customername" => descending
                ? query.OrderByDescending(order => order.ShippingRecipient)
                : query.OrderBy(order => order.ShippingRecipient),
            "total" or "grandtotal" => descending
                ? query.OrderByDescending(order => order.GrandTotal)
                : query.OrderBy(order => order.GrandTotal),
            "orderstatus" => descending
                ? query.OrderByDescending(order => order.OrderStatus)
                : query.OrderBy(order => order.OrderStatus),
            "paymentstatus" => descending
                ? query.OrderByDescending(order => order.PaymentStatus)
                : query.OrderBy(order => order.PaymentStatus),
            "fulfillmentstatus" => descending
                ? query.OrderByDescending(order => order.FulfillmentStatus)
                : query.OrderBy(order => order.FulfillmentStatus),
            "placedat" or "createddate" or "date" => descending
                ? query.OrderByDescending(order => order.PlacedAt ?? order.CreatedDate)
                : query.OrderBy(order => order.PlacedAt ?? order.CreatedDate),
            _ => descending
                ? query.OrderByDescending(order => order.Id)
                : query.OrderBy(order => order.Id),
        };
    }
}
