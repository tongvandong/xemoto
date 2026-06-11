using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Services.Audit;
using MoToSale.Services.Operations;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/business-operations")]
public class BusinessOperationsController : ControllerBase
{
    private readonly IBusinessOperationsService _service;
    private readonly IAuditLogService _auditLogs;

    public BusinessOperationsController(IBusinessOperationsService service, IAuditLogService auditLogs)
    {
        _service = service;
        _auditLogs = auditLogs;
    }

    private int? UserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdText, out int userId))
            {
                return userId;
            }

            return null;
        }
    }

    private string? ActorName
    {
        get
        {
            string? name = User.FindFirstValue(ClaimTypes.Name);

            if (!string.IsNullOrWhiteSpace(name))
            {
                return name;
            }

            return User.FindFirstValue(ClaimTypes.Email);
        }
    }

    private async Task AddAuditAsync(string entity, string entityId, string action, string? newValue = null)
    {
        await _auditLogs.AddAsync(entity, entityId, action, newValue, UserId, ActorName);
    }

    private async Task<IActionResult> RunAsync(Func<Task> action)
    {
        try
        {
            await action();
            return Ok();
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    private async Task<IActionResult> CreateAsync(Func<Task<int>> action, Func<int, Task>? afterSuccess = null)
    {
        try
        {
            int id = await action();

            if (afterSuccess != null)
            {
                await afterSuccess(id);
            }

            return Ok(new IdResponse { Id = id });
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> Lookups()
    {
        var result = await _service.GetLookupsAsync();
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        bool isAdmin = User.IsInRole(RoleConstant.Admin);
        var result = await _service.GetSummaryAsync(isAdmin);
        return Ok(result);
    }

    [HttpGet("suppliers")]
    public async Task<IActionResult> Suppliers()
    {
        var result = await _service.GetSuppliersAsync();
        return Ok(result);
    }

    [HttpPost("suppliers")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateSupplier(SupplierRequest request)
    {
        return await CreateAsync(
            () => _service.SaveSupplierAsync(null, request),
            id => AddAuditAsync("Supplier", id.ToString(), "Create", request.Name));
    }

    [HttpPut("suppliers/{id:int}")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> UpdateSupplier(int id, SupplierRequest request)
    {
        var result = await CreateAsync(() => _service.SaveSupplierAsync(id, request));

        if (result is OkObjectResult)
        {
            await AddAuditAsync("Supplier", id.ToString(), "Update", request.Name);
        }

        return result;
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> Purchases()
    {
        var result = await _service.GetPurchaseOrdersAsync();
        return Ok(result);
    }

    [HttpPost("purchases")]
    public async Task<IActionResult> CreatePurchase(CreatePurchaseOrderRequest request)
    {
        return await CreateAsync(
            () => _service.CreatePurchaseOrderAsync(request, UserId),
            id =>
            {
                string auditValue = $"SupplierId={request.SupplierId};Lines={request.Lines.Count}";
                return AddAuditAsync("PurchaseOrder", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPost("purchases/{id:int}/approve")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ApprovePurchase(int id)
    {
        var result = await RunAsync(() => _service.ApprovePurchaseOrderAsync(id, UserId));

        if (result is OkResult)
        {
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Approve");
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/cancel")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CancelPurchase(int id)
    {
        var result = await RunAsync(() => _service.CancelPurchaseOrderAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Cancel");
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/receive")]
    public async Task<IActionResult> ReceivePurchase(int id, ReceivePurchaseOrderRequest request)
    {
        var result = await CreateAsync(() => _service.ReceivePurchaseOrderAsync(id, request, UserId));

        if (result is OkObjectResult)
        {
            string auditValue = $"Lines={request.Lines.Count}";
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Receive", auditValue);
        }

        return result;
    }

    [HttpPost("purchases/{id:int}/pay")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> PayPurchase(int id, PayPurchaseOrderRequest request)
    {
        var result = await CreateAsync(() => _service.PayPurchaseOrderAsync(id, request, UserId));

        if (result is OkObjectResult)
        {
            string auditValue = $"Amount={request.Amount};Method={request.Method}";
            await AddAuditAsync("PurchaseOrder", id.ToString(), "Pay", auditValue);
        }

        return result;
    }

    [HttpGet("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> Cash()
    {
        var result = await _service.GetCashTransactionsAsync();
        return Ok(result);
    }

    [HttpPost("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateCash(CashTransactionRequest request)
    {
        return await CreateAsync(
            () => _service.CreateCashTransactionAsync(request, UserId),
            id =>
            {
                string auditValue = $"Type={request.TransactionType};Amount={request.Amount};Category={request.Category}";
                return AddAuditAsync("CashTransaction", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPost("cash/{id:int}/reverse")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ReverseCash(int id)
    {
        var result = await CreateAsync(() => _service.ReverseCashTransactionAsync(id, UserId));

        if (result is OkObjectResult)
        {
            await AddAuditAsync("CashTransaction", id.ToString(), "Reverse");
        }

        return result;
    }

    [HttpGet("repairs")]
    public async Task<IActionResult> Repairs()
    {
        var result = await _service.GetRepairsAsync();
        return Ok(result);
    }

    [HttpPost("repairs")]
    public async Task<IActionResult> CreateRepair(CreateRepairOrderRequest request)
    {
        return await CreateAsync(
            () => _service.CreateRepairAsync(request),
            id =>
            {
                string auditValue = $"{request.VehicleDescription};{request.ReportedIssue}";
                return AddAuditAsync("RepairOrder", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPut("repairs/{id:int}")]
    public async Task<IActionResult> UpdateRepair(int id, CreateRepairOrderRequest request)
    {
        var result = await RunAsync(() => _service.UpdateRepairAsync(id, request));

        if (result is OkResult)
        {
            await AddAuditAsync("RepairOrder", id.ToString(), "Update", request.VehicleDescription);
        }

        return result;
    }

    [HttpPut("repairs/{id:int}/status")]
    public async Task<IActionResult> RepairStatus(int id, UpdateRepairStatusRequest request)
    {
        var result = await RunAsync(() => _service.UpdateRepairStatusAsync(id, request));

        if (result is OkResult)
        {
            string auditValue = $"{request.Status};{request.Note}";
            await AddAuditAsync("RepairOrder", id.ToString(), "UpdateStatus", auditValue);
        }

        return result;
    }

    [HttpGet("interactions")]
    public async Task<IActionResult> Interactions()
    {
        var result = await _service.GetInteractionsAsync();
        return Ok(result);
    }

    [HttpPost("interactions")]
    public async Task<IActionResult> CreateInteraction(CustomerInteractionRequest request)
    {
        return await CreateAsync(
            () => _service.CreateInteractionAsync(request),
            id => AddAuditAsync("CustomerInteraction", id.ToString(), "Create", request.Subject));
    }

    [HttpPost("interactions/{id:int}/complete")]
    public async Task<IActionResult> CompleteInteraction(int id)
    {
        var result = await RunAsync(() => _service.CompleteInteractionAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Complete");
        }

        return result;
    }

    [HttpPut("interactions/{id:int}")]
    public async Task<IActionResult> UpdateInteraction(int id, CustomerInteractionRequest request)
    {
        var result = await RunAsync(() => _service.UpdateInteractionAsync(id, request));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Update", request.Subject);
        }

        return result;
    }

    [HttpPost("interactions/{id:int}/cancel")]
    public async Task<IActionResult> CancelInteraction(int id)
    {
        var result = await RunAsync(() => _service.CancelInteractionAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("CustomerInteraction", id.ToString(), "Cancel");
        }

        return result;
    }

    [HttpGet("attendance")]
    public async Task<IActionResult> Attendance()
    {
        var result = await _service.GetAttendanceAsync();
        return Ok(result);
    }

    [HttpPost("attendance/check-in")]
    public async Task<IActionResult> CheckIn(AttendanceRequest request)
    {
        bool currentUserIsAdmin = User.IsInRole(RoleConstant.Admin);
        bool currentUserOwnsAttendance = UserId == request.StaffUserId;

        if (!currentUserIsAdmin && !currentUserOwnsAttendance)
        {
            return Forbid();
        }

        return await CreateAsync(
            () => _service.CheckInAsync(request),
            id =>
            {
                string auditValue = $"Staff={request.StaffUserId}";
                return AddAuditAsync("StaffAttendance", id.ToString(), "CheckIn", auditValue);
            });
    }

    [HttpPost("attendance/{id:int}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        int staffUserId;
        try
        {
            staffUserId = await _service.GetAttendanceStaffUserIdAsync(id);
        }
        catch (BusinessOperationsException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }

        bool currentUserIsAdmin = User.IsInRole(RoleConstant.Admin);
        bool currentUserOwnsAttendance = UserId == staffUserId;

        if (!currentUserIsAdmin && !currentUserOwnsAttendance)
        {
            return Forbid();
        }

        var result = await RunAsync(() => _service.CheckOutAsync(id));

        if (result is OkResult)
        {
            await AddAuditAsync("StaffAttendance", id.ToString(), "CheckOut");
        }

        return result;
    }
}
