using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;
public partial class BusinessOperationsService
{
    public async Task<ItemsResponse<CustomerInteractionDto>> GetInteractionsAsync()
    {
        List<CustomerInteractionDto> interactions =
            await (from interaction in _db.CustomerInteractions.AsNoTracking()
                   join customer in _db.Users.AsNoTracking() on interaction.CustomerId equals customer.Id
                   join staffUser in _db.Users.AsNoTracking() on interaction.AssignedStaffId equals staffUser.Id into staffRows
                   from staff in staffRows.DefaultIfEmpty()
                   orderby interaction.Id descending
                   select new CustomerInteractionDto
                   {
                       Id = interaction.Id,
                       CustomerId = interaction.CustomerId,
                       CustomerName = customer.FullName,
                       AssignedStaffId = interaction.AssignedStaffId,
                       StaffName = staff == null ? null : staff.FullName,
                       InteractionType = interaction.InteractionType,
                       InteractionStatus = interaction.InteractionStatus,
                       Subject = interaction.Subject,
                       Note = interaction.Note,
                       FollowUpAt = interaction.FollowUpAt,
                       CompletedAt = interaction.CompletedAt,
                       CreatedDate = interaction.CreatedDate
                   })
                .ToListAsync();

        return new ItemsResponse<CustomerInteractionDto> { Items = interactions };
    }

    public async Task<int> CreateInteractionAsync(CustomerInteractionRequest request)
    {
        await ValidateInteractionRequestAsync(request);

        var interaction = new CustomerInteraction
        {
            CustomerId = request.CustomerId,
            AssignedStaffId = request.AssignedStaffId,
            InteractionType = request.InteractionType,
            Subject = request.Subject,
            Note = request.Note,
            FollowUpAt = request.FollowUpAt,
            CreatedDate = DateTime.UtcNow
        };

        _db.CustomerInteractions.Add(interaction);
        await _db.SaveChangesAsync();
        return interaction.Id;
    }

    public async Task UpdateInteractionAsync(int id, CustomerInteractionRequest request)
    {
        CustomerInteraction interaction = await _db.CustomerInteractions.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");

        if (interaction.InteractionStatus != "Open")
        {
            throw new BusinessOperationsException("Chỉ lịch đang mở mới được cập nhật.");
        }

        await ValidateInteractionRequestAsync(request);

        interaction.CustomerId = request.CustomerId;
        interaction.AssignedStaffId = request.AssignedStaffId;
        interaction.InteractionType = request.InteractionType;
        interaction.Subject = request.Subject;
        interaction.Note = request.Note;
        interaction.FollowUpAt = request.FollowUpAt;
        interaction.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task CompleteInteractionAsync(int id)
    {
        CustomerInteraction interaction = await _db.CustomerInteractions.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");

        interaction.InteractionStatus = "Completed";
        interaction.CompletedAt = DateTime.UtcNow;
        interaction.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task CancelInteractionAsync(int id)
    {
        CustomerInteraction interaction = await _db.CustomerInteractions.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");

        if (interaction.InteractionStatus != "Open")
        {
            throw new BusinessOperationsException("Chỉ lịch đang mở mới được hủy.");
        }

        interaction.InteractionStatus = "Cancelled";
        interaction.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task<ItemsResponse<StaffAttendanceDto>> GetAttendanceAsync()
    {
        List<StaffAttendanceDto> items =
            await (from attendance in _db.StaffAttendances.AsNoTracking()
                   join user in _db.Users.AsNoTracking() on attendance.StaffUserId equals user.Id
                   orderby attendance.CheckInAt descending
                   select new StaffAttendanceDto
                   {
                       Id = attendance.Id,
                       StaffUserId = attendance.StaffUserId,
                       StaffName = user.FullName,
                       CheckInAt = attendance.CheckInAt,
                       CheckOutAt = attendance.CheckOutAt,
                       Note = attendance.Note
                   })
                .ToListAsync();

        return new ItemsResponse<StaffAttendanceDto> { Items = items };
    }

    public async Task<int> CheckInAsync(AttendanceRequest request)
    {
        if (!await HasRoleAsync(request.StaffUserId, "Staff"))
        {
            throw new BusinessOperationsException("Nhân viên không hợp lệ.");
        }

        bool hasOpenAttendance = await _db.StaffAttendances.AnyAsync(attendance =>
            attendance.StaffUserId == request.StaffUserId &&
            attendance.CheckOutAt == null);

        if (hasOpenAttendance)
        {
            throw new BusinessOperationsException("Nhân viên đang có ca chưa check-out.");
        }

        var attendanceRow = new StaffAttendance
        {
            StaffUserId = request.StaffUserId,
            Note = request.Note,
            CheckInAt = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow
        };

        _db.StaffAttendances.Add(attendanceRow);
        await _db.SaveChangesAsync();
        return attendanceRow.Id;
    }

    public async Task<int> GetAttendanceStaffUserIdAsync(int id)
    {
        StaffAttendance attendance = await _db.StaffAttendances
            .AsNoTracking()
            .FirstOrDefaultAsync(row => row.Id == id)
            ?? throw new BusinessOperationsException("Không tìm thấy lượt chấm công.");

        return attendance.StaffUserId;
    }

    public async Task CheckOutAsync(int id)
    {
        StaffAttendance attendance = await _db.StaffAttendances.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy lượt chấm công.");

        if (attendance.CheckOutAt.HasValue)
        {
            throw new BusinessOperationsException("Ca đã check-out.");
        }

        attendance.CheckOutAt = DateTime.UtcNow;
        attendance.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task<BusinessSummaryDto> GetSummaryAsync(bool includeFinancials)
    {
        return new BusinessSummaryDto
        {
            Suppliers = await _db.Suppliers.CountAsync(supplier => supplier.Status == 1),
            PendingPurchases = await CountPendingPurchasesAsync(),
            PurchaseValue = includeFinancials ? await SumPurchaseValueAsync() : 0,
            CashIn = includeFinancials ? await SumCashAsync("Receipt") : 0,
            CashOut = includeFinancials ? await SumCashAsync("Payment") : 0,
            OpenRepairs = await CountOpenRepairsAsync(),
            OpenInteractions = await _db.CustomerInteractions.CountAsync(interaction => interaction.InteractionStatus == "Open")
        };
    }
    private async Task ValidateInteractionRequestAsync(CustomerInteractionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            throw new BusinessOperationsException("Nội dung chăm sóc là bắt buộc.");
        }

        if (!await HasRoleAsync(request.CustomerId, "Customer"))
        {
            throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        }

        if (request.AssignedStaffId.HasValue && !await HasRoleAsync(request.AssignedStaffId.Value, "Staff"))
        {
            throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        }

        if (!IsValidInteractionType(request.InteractionType))
        {
            throw new BusinessOperationsException("Loại chăm sóc khách hàng không hợp lệ.");
        }
    }

    private static bool IsValidInteractionType(string interactionType)
    {
        return interactionType == "Call" ||
               interactionType == "Email" ||
               interactionType == "Visit" ||
               interactionType == "Message";
    }

    private async Task<int> CountPendingPurchasesAsync()
    {
        return await _db.PurchaseOrders.CountAsync(order =>
            order.PurchaseStatus == "Draft" ||
            order.PurchaseStatus == "Approved" ||
            order.PurchaseStatus == "PartiallyReceived");
    }

    private async Task<decimal> SumPurchaseValueAsync()
    {
        decimal? total = await _db.PurchaseOrders
            .Where(order => order.PurchaseStatus != "Cancelled")
            .SumAsync(order => (decimal?)order.TotalAmount);

        return total ?? 0;
    }

    private async Task<decimal> SumCashAsync(string transactionType)
    {
        decimal? total = await _db.CashTransactions
            .Where(transaction => transaction.TransactionType == transactionType)
            .SumAsync(transaction => (decimal?)transaction.Amount);

        return total ?? 0;
    }

    private async Task<int> CountOpenRepairsAsync()
    {
        return await _db.RepairOrders.CountAsync(repair =>
            repair.RepairStatus != "Delivered" &&
            repair.RepairStatus != "Cancelled");
    }

    private Task<bool> HasRoleAsync(int userId, string role)
    {
        return _db.UserRoles.AnyAsync(userRole =>
            userRole.UserId == userId &&
            userRole.Role.Code == role);
    }
}
