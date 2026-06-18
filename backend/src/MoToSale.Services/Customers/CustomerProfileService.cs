using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Customers;
using MoToSale.Repository;

namespace MoToSale.Services.Customers;

public class CustomerProfileService : ICustomerProfileService
{
    private readonly AppDbContext _db;

    public CustomerProfileService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CustomerProfileResponse?> GetProfileAsync(int customerId)
    {
        CustomerProfileDto? customer = await _db.Users
            .AsNoTracking()
            .Where(user => user.Id == customerId)
            .Select(user => new CustomerProfileDto(
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.CareNote,
                user.CreatedDate,
                user.Status))
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return null;
        }

        List<CustomerProfileOrderDto> orders = await GetOrdersAsync(customerId);
        List<CustomerProfileWarrantyDto> warranties = await GetWarrantiesAsync(customerId, customer.PhoneNumber);
        List<CustomerProfileRepairDto> repairs = await GetRepairsAsync(customerId);
        List<CustomerProfileInteractionDto> interactions = await GetInteractionsAsync(customerId);

        CustomerProfileSummaryDto summary = BuildSummary(orders, warranties, repairs, interactions);
        List<CustomerTimelineItemDto> timeline = BuildTimeline(orders, warranties, repairs, interactions);

        return new CustomerProfileResponse(
            customer,
            summary,
            orders,
            warranties,
            repairs,
            interactions,
            timeline);
    }

    private async Task<List<CustomerProfileOrderDto>> GetOrdersAsync(int customerId)
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(order => order.UserId == customerId)
            .OrderByDescending(order => order.CreatedDate)
            .Take(20)
            .Select(order => new CustomerProfileOrderDto(
                order.Id,
                order.Code,
                order.OrderStatus,
                order.PaymentStatus,
                order.FulfillmentStatus,
                order.GrandTotal,
                order.RemainingAmount,
                order.PlacedAt,
                order.CreatedDate))
            .ToListAsync();
    }

    private async Task<List<CustomerProfileWarrantyDto>> GetWarrantiesAsync(int customerId, string? phoneNumber)
    {
        return await _db.Warranties
            .AsNoTracking()
            .Where(warranty => warranty.CustomerId == customerId || warranty.CustomerPhone == phoneNumber)
            .OrderByDescending(warranty => warranty.CreatedDate)
            .Take(20)
            .Select(warranty => new CustomerProfileWarrantyDto(
                warranty.Id,
                warranty.Code,
                warranty.ProductSnapshot,
                warranty.SerialNumber,
                warranty.WarrantyStatus,
                warranty.StartAt,
                warranty.Months,
                warranty.ReceivedAt,
                warranty.CompletedAt,
                warranty.Note))
            .ToListAsync();
    }

    private async Task<List<CustomerProfileRepairDto>> GetRepairsAsync(int customerId)
    {
        return await _db.RepairOrders
            .AsNoTracking()
            .Where(repair => repair.CustomerId == customerId)
            .OrderByDescending(repair => repair.ReceivedAt)
            .Take(20)
            .Select(repair => new CustomerProfileRepairDto(
                repair.Id,
                repair.Code,
                repair.VehicleDescription,
                repair.ReportedIssue,
                repair.RepairStatus,
                repair.LaborCost + repair.PartsCost,
                repair.ReceivedAt,
                repair.CompletedAt,
                repair.Note))
            .ToListAsync();
    }

    private async Task<List<CustomerProfileInteractionDto>> GetInteractionsAsync(int customerId)
    {
        return await _db.CustomerInteractions
            .AsNoTracking()
            .Where(interaction => interaction.CustomerId == customerId)
            .OrderByDescending(interaction => interaction.FollowUpAt ?? interaction.CreatedDate)
            .Take(30)
            .Select(interaction => new CustomerProfileInteractionDto(
                interaction.Id,
                interaction.InteractionType,
                interaction.InteractionStatus,
                interaction.Subject,
                interaction.Note,
                interaction.FollowUpAt,
                interaction.CompletedAt,
                interaction.CreatedDate))
            .ToListAsync();
    }

    private static CustomerProfileSummaryDto BuildSummary(
        IReadOnlyList<CustomerProfileOrderDto> orders,
        IReadOnlyList<CustomerProfileWarrantyDto> warranties,
        IReadOnlyList<CustomerProfileRepairDto> repairs,
        IReadOnlyList<CustomerProfileInteractionDto> interactions)
    {
        decimal orderTotal = orders.Sum(order => order.GrandTotal);
        decimal remainingTotal = orders
            .Where(order => order.PaymentStatus != "Paid" && order.PaymentStatus != "Refunded")
            .Sum(order => order.RemainingAmount);
        int openCrmCount = interactions.Count(interaction => interaction.InteractionStatus == "Open");

        return new CustomerProfileSummaryDto(
            orders.Count,
            orderTotal,
            remainingTotal,
            warranties.Count,
            repairs.Count,
            openCrmCount);
    }

    private static List<CustomerTimelineItemDto> BuildTimeline(
        IReadOnlyList<CustomerProfileOrderDto> orders,
        IReadOnlyList<CustomerProfileWarrantyDto> warranties,
        IReadOnlyList<CustomerProfileRepairDto> repairs,
        IReadOnlyList<CustomerProfileInteractionDto> interactions)
    {
        var orderItems = orders.Select(order => new CustomerTimelineItemDto(
            "Order",
            $"Đơn hàng {order.Code}",
            order.OrderStatus,
            $"{order.PaymentStatus} / {order.FulfillmentStatus}",
            order.PlacedAt ?? order.CreatedDate));

        var warrantyItems = warranties.Select(warranty => new CustomerTimelineItemDto(
            "Warranty",
            $"Bảo hành {warranty.Code}",
            warranty.WarrantyStatus,
            warranty.ProductSnapshot,
            warranty.ReceivedAt));

        var repairItems = repairs.Select(repair => new CustomerTimelineItemDto(
            "Repair",
            $"Sửa chữa {repair.Code}",
            repair.RepairStatus,
            repair.ReportedIssue,
            repair.ReceivedAt));

        var interactionItems = interactions.Select(interaction => new CustomerTimelineItemDto(
            "CRM",
            interaction.Subject,
            interaction.InteractionStatus,
            interaction.Note,
            interaction.FollowUpAt ?? interaction.CreatedDate));

        return orderItems
            .Concat(warrantyItems)
            .Concat(repairItems)
            .Concat(interactionItems)
            .OrderByDescending(item => item.Date)
            .Take(40)
            .ToList();
    }
}
