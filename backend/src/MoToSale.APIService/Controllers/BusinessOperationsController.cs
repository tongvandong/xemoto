using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Audit;
using MoToSale.Repository;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/business-operations")]
public class BusinessOperationsController : ControllerBase
{
    private readonly IBusinessOperationsService _service;
    private readonly AppDbContext _db;

    public BusinessOperationsController(IBusinessOperationsService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }

    private int? UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task AddAuditAsync(string entity, string entityId, string action, string? newValue = null)
    {
        var now = DateTime.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            Entity = entity,
            EntityId = entityId,
            Action = action,
            NewValueJson = newValue,
            ActorId = UserId,
            ActorName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            At = now,
            CreatedDate = now
        });
        await _db.SaveChangesAsync();
    }

    private async Task<IActionResult> Run(Func<Task> action)
    {
        try { await action(); return Ok(); }
        catch (BusinessOperationsException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private async Task<IActionResult> Create(Func<Task<int>> action)
    {
        try { return Ok(new { id = await action() }); }
        catch (BusinessOperationsException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("lookups")] public async Task<IActionResult> Lookups() => Ok(await _service.GetLookupsAsync());
    [HttpGet("summary")] public async Task<IActionResult> Summary() => Ok(await _service.GetSummaryAsync(User.IsInRole(RoleConstant.Admin)));
    [HttpGet("suppliers")] public async Task<IActionResult> Suppliers() => Ok(await _service.GetSuppliersAsync());

    [HttpPost("suppliers")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateSupplier(SupplierRequest r)
    {
        var result = await Create(() => _service.SaveSupplierAsync(null, r));
        if (result is OkObjectResult ok && ok.Value is not null)
        {
            var id = ok.Value.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("Supplier", id, "Create", r.Name);
        }
        return result;
    }

    [HttpPut("suppliers/{id:int}")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> UpdateSupplier(int id, SupplierRequest r)
    {
        var result = await Create(() => _service.SaveSupplierAsync(id, r));
        if (result is OkObjectResult) await AddAuditAsync("Supplier", id.ToString(), "Update", r.Name);
        return result;
    }

    [HttpGet("purchases")] public async Task<IActionResult> Purchases() => Ok(await _service.GetPurchaseOrdersAsync());

    [HttpPost("purchases")]
    public async Task<IActionResult> CreatePurchase(CreatePurchaseOrderRequest r)
    {
        var result = await Create(() => _service.CreatePurchaseOrderAsync(r, UserId));
        if (result is OkObjectResult ok)
        {
            var id = ok.Value?.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("PurchaseOrder", id, "Create", $"SupplierId={r.SupplierId};Lines={r.Lines.Count}");
        }
        return result;
    }

    [HttpPost("purchases/{id:int}/approve")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ApprovePurchase(int id)
    {
        var result = await Run(() => _service.ApprovePurchaseOrderAsync(id, UserId));
        if (result is OkResult) await AddAuditAsync("PurchaseOrder", id.ToString(), "Approve");
        return result;
    }

    [HttpPost("purchases/{id:int}/cancel")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CancelPurchase(int id)
    {
        var result = await Run(() => _service.CancelPurchaseOrderAsync(id));
        if (result is OkResult) await AddAuditAsync("PurchaseOrder", id.ToString(), "Cancel");
        return result;
    }

    [HttpPost("purchases/{id:int}/receive")]
    public async Task<IActionResult> ReceivePurchase(int id, ReceivePurchaseOrderRequest r)
    {
        var result = await Create(() => _service.ReceivePurchaseOrderAsync(id, r, UserId));
        if (result is OkObjectResult) await AddAuditAsync("PurchaseOrder", id.ToString(), "Receive", $"Lines={r.Lines.Count}");
        return result;
    }

    [HttpPost("purchases/{id:int}/pay")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> PayPurchase(int id, PayPurchaseOrderRequest r)
    {
        var result = await Create(() => _service.PayPurchaseOrderAsync(id, r, UserId));
        if (result is OkObjectResult) await AddAuditAsync("PurchaseOrder", id.ToString(), "Pay", $"Amount={r.Amount};Method={r.Method}");
        return result;
    }

    [HttpGet("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> Cash() => Ok(await _service.GetCashTransactionsAsync());

    [HttpPost("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateCash(CashTransactionRequest r)
    {
        var result = await Create(() => _service.CreateCashTransactionAsync(r, UserId));
        if (result is OkObjectResult ok)
        {
            var id = ok.Value?.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("CashTransaction", id, "Create", $"Type={r.TransactionType};Amount={r.Amount};Category={r.Category}");
        }
        return result;
    }

    [HttpPost("cash/{id:int}/reverse")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ReverseCash(int id)
    {
        var result = await Create(() => _service.ReverseCashTransactionAsync(id, UserId));
        if (result is OkObjectResult) await AddAuditAsync("CashTransaction", id.ToString(), "Reverse");
        return result;
    }

    [HttpGet("repairs")] public async Task<IActionResult> Repairs() => Ok(await _service.GetRepairsAsync());

    [HttpPost("repairs")]
    public async Task<IActionResult> CreateRepair(CreateRepairOrderRequest r)
    {
        var result = await Create(() => _service.CreateRepairAsync(r));
        if (result is OkObjectResult ok)
        {
            var id = ok.Value?.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("RepairOrder", id, "Create", $"{r.VehicleDescription};{r.ReportedIssue}");
        }
        return result;
    }

    [HttpPut("repairs/{id:int}")]
    public async Task<IActionResult> UpdateRepair(int id, CreateRepairOrderRequest r)
    {
        var result = await Run(() => _service.UpdateRepairAsync(id, r));
        if (result is OkResult) await AddAuditAsync("RepairOrder", id.ToString(), "Update", r.VehicleDescription);
        return result;
    }

    [HttpPut("repairs/{id:int}/status")]
    public async Task<IActionResult> RepairStatus(int id, UpdateRepairStatusRequest r)
    {
        var result = await Run(() => _service.UpdateRepairStatusAsync(id, r));
        if (result is OkResult) await AddAuditAsync("RepairOrder", id.ToString(), "UpdateStatus", $"{r.Status};{r.Note}");
        return result;
    }

    [HttpGet("interactions")] public async Task<IActionResult> Interactions() => Ok(await _service.GetInteractionsAsync());

    [HttpPost("interactions")]
    public async Task<IActionResult> CreateInteraction(CustomerInteractionRequest r)
    {
        var result = await Create(() => _service.CreateInteractionAsync(r));
        if (result is OkObjectResult ok)
        {
            var id = ok.Value?.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("CustomerInteraction", id, "Create", r.Subject);
        }
        return result;
    }

    [HttpPost("interactions/{id:int}/complete")]
    public async Task<IActionResult> CompleteInteraction(int id)
    {
        var result = await Run(() => _service.CompleteInteractionAsync(id));
        if (result is OkResult) await AddAuditAsync("CustomerInteraction", id.ToString(), "Complete");
        return result;
    }

    [HttpPut("interactions/{id:int}")]
    public async Task<IActionResult> UpdateInteraction(int id, CustomerInteractionRequest r)
    {
        var result = await Run(() => _service.UpdateInteractionAsync(id, r));
        if (result is OkResult) await AddAuditAsync("CustomerInteraction", id.ToString(), "Update", r.Subject);
        return result;
    }

    [HttpPost("interactions/{id:int}/cancel")]
    public async Task<IActionResult> CancelInteraction(int id)
    {
        var result = await Run(() => _service.CancelInteractionAsync(id));
        if (result is OkResult) await AddAuditAsync("CustomerInteraction", id.ToString(), "Cancel");
        return result;
    }

    [HttpGet("attendance")] public async Task<IActionResult> Attendance() => Ok(await _service.GetAttendanceAsync());

    [HttpPost("attendance/check-in")]
    public async Task<IActionResult> CheckIn(AttendanceRequest r)
    {
        if (!User.IsInRole(RoleConstant.Admin) && UserId != r.StaffUserId) return Forbid();
        var result = await Create(() => _service.CheckInAsync(r));
        if (result is OkObjectResult ok)
        {
            var id = ok.Value?.GetType().GetProperty("id")?.GetValue(ok.Value)?.ToString();
            if (id is not null) await AddAuditAsync("StaffAttendance", id, "CheckIn", $"Staff={r.StaffUserId}");
        }
        return result;
    }

    [HttpPost("attendance/{id:int}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        var attendance = await _db.StaffAttendances.FindAsync(id);
        if (attendance is null) return BadRequest(new { message = "Không tìm thấy lượt chấm công." });
        if (!User.IsInRole(RoleConstant.Admin) && UserId != attendance.StaffUserId) return Forbid();
        var result = await Run(() => _service.CheckOutAsync(id));
        if (result is OkResult) await AddAuditAsync("StaffAttendance", id.ToString(), "CheckOut");
        return result;
    }
}
