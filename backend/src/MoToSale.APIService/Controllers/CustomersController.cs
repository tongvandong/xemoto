using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoToSale.Common.Auth;
using MoToSale.Repository;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustomersController(AppDbContext db) => _db = db;

    [HttpGet("{id:int}/profile")]
    public async Task<IActionResult> Profile(int id)
    {
        var customer = await _db.Users.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.FullName,
                x.Email,
                x.PhoneNumber,
                x.CareNote,
                x.CreatedDate,
                x.Status
            })
            .FirstOrDefaultAsync();

        if (customer is null) return NotFound(new { message = "Không tìm thấy khách hàng." });

        var orders = await _db.Orders.AsNoTracking()
            .Where(x => x.UserId == id)
            .OrderByDescending(x => x.CreatedDate)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.Code,
                x.OrderStatus,
                x.PaymentStatus,
                x.FulfillmentStatus,
                x.GrandTotal,
                x.RemainingAmount,
                x.PlacedAt,
                x.CreatedDate
            })
            .ToListAsync();

        var warranties = await _db.Warranties.AsNoTracking()
            .Where(x => x.CustomerId == id || x.CustomerPhone == customer.PhoneNumber)
            .OrderByDescending(x => x.CreatedDate)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.Code,
                x.ProductSnapshot,
                x.SerialNumber,
                x.WarrantyStatus,
                x.StartAt,
                x.Months,
                x.ReceivedAt,
                x.CompletedAt,
                x.Note
            })
            .ToListAsync();

        var repairs = await _db.RepairOrders.AsNoTracking()
            .Where(x => x.CustomerId == id)
            .OrderByDescending(x => x.ReceivedAt)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.Code,
                x.VehicleDescription,
                x.ReportedIssue,
                x.RepairStatus,
                Total = x.LaborCost + x.PartsCost,
                x.ReceivedAt,
                x.CompletedAt,
                x.Note
            })
            .ToListAsync();

        var interactions = await _db.CustomerInteractions.AsNoTracking()
            .Where(x => x.CustomerId == id)
            .OrderByDescending(x => x.FollowUpAt ?? x.CreatedDate)
            .Take(30)
            .Select(x => new
            {
                x.Id,
                x.InteractionType,
                x.InteractionStatus,
                x.Subject,
                x.Note,
                x.FollowUpAt,
                x.CompletedAt,
                x.CreatedDate
            })
            .ToListAsync();

        var orderTotal = orders.Sum(x => x.GrandTotal);
        var remainingTotal = orders.Sum(x => x.RemainingAmount);

        var timeline = orders.Select(x => new CustomerTimelineItem(
                "Order",
                $"Đơn hàng {x.Code}",
                x.OrderStatus,
                $"{x.PaymentStatus} / {x.FulfillmentStatus}",
                x.PlacedAt ?? x.CreatedDate))
            .Concat(warranties.Select(x => new CustomerTimelineItem(
                "Warranty",
                $"Bảo hành {x.Code}",
                x.WarrantyStatus,
                x.ProductSnapshot,
                x.ReceivedAt)))
            .Concat(repairs.Select(x => new CustomerTimelineItem(
                "Repair",
                $"Sửa chữa {x.Code}",
                x.RepairStatus,
                x.ReportedIssue,
                x.ReceivedAt)))
            .Concat(interactions.Select(x => new CustomerTimelineItem(
                "CRM",
                x.Subject,
                x.InteractionStatus,
                x.Note,
                x.FollowUpAt ?? x.CreatedDate)))
            .OrderByDescending(x => x.Date)
            .Take(40)
            .ToList();

        return Ok(new
        {
            customer,
            summary = new
            {
                orderCount = orders.Count,
                orderTotal,
                remainingTotal,
                warrantyCount = warranties.Count,
                repairCount = repairs.Count,
                openCrmCount = interactions.Count(x => x.InteractionStatus == "Open")
            },
            orders,
            warranties,
            repairs,
            interactions,
            timeline
        });
    }
}

public record CustomerTimelineItem(string Type, string Title, string Status, string? Note, DateTime Date);
