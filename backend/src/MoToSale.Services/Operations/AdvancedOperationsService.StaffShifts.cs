using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Operations;

namespace MoToSale.Services.Operations;

public partial class AdvancedOperationsService
{
    public async Task<List<StaffShiftDto>> GetShiftsAsync(DateTime? from, DateTime? to, int? staffUserId)
    {
        var q = _db.StaffShifts.AsNoTracking().AsQueryable();
        if (from.HasValue) q = q.Where(x => x.EndsAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.StartsAt <= to.Value);
        if (staffUserId.HasValue) q = q.Where(x => x.StaffUserId == staffUserId.Value);
        return await (from x in q
                      join u in _db.Users.AsNoTracking() on x.StaffUserId equals u.Id
                      orderby x.StartsAt
                      select new StaffShiftDto(x.Id, x.StaffUserId, u.FullName, x.StartsAt, x.EndsAt, x.ShiftStatus, x.Note))
            .ToListAsync();
    }

    public async Task<int> CreateShiftAsync(CreateStaffShiftRequest r, int? userId)
    {
        ValidateShift(r.StartsAt, r.EndsAt);
        if (!await IsStaffAsync(r.StaffUserId)) throw new AdvancedOperationsException("Chỉ tài khoản nhân viên mới được phân ca.");
        if (await HasOverlapAsync(r.StaffUserId, r.StartsAt, r.EndsAt, null)) throw new AdvancedOperationsException("Ca làm việc bị trùng thời gian với ca đã có.");
        var row = new StaffShift { StaffUserId = r.StaffUserId, StartsAt = r.StartsAt, EndsAt = r.EndsAt, Note = r.Note, AssignedBy = userId, CreatedDate = DateTime.UtcNow };
        _db.StaffShifts.Add(row);
        await _db.SaveChangesAsync();
        return row.Id;
    }

    public async Task UpdateShiftAsync(int id, UpdateStaffShiftRequest r)
    {
        ValidateShift(r.StartsAt, r.EndsAt);
        var row = await _db.StaffShifts.FindAsync(id) ?? throw new AdvancedOperationsException("Không tìm thấy ca làm việc.");
        if (await HasOverlapAsync(row.StaffUserId, r.StartsAt, r.EndsAt, id)) throw new AdvancedOperationsException("Ca làm việc bị trùng thời gian với ca đã có.");
        row.StartsAt = r.StartsAt; row.EndsAt = r.EndsAt;
        row.ShiftStatus = r.ShiftStatus is "Completed" or "Cancelled" ? r.ShiftStatus : "Scheduled";
        row.Note = r.Note; row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteShiftAsync(int id)
    {
        var row = await _db.StaffShifts.FindAsync(id) ?? throw new AdvancedOperationsException("Không tìm thấy ca làm việc.");
        row.ShiftStatus = "Cancelled";
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private Task<bool> HasOverlapAsync(int staffId, DateTime startsAt, DateTime endsAt, int? exceptId) =>
        _db.StaffShifts.AnyAsync(x => x.StaffUserId == staffId && (!exceptId.HasValue || x.Id != exceptId) && x.ShiftStatus != "Cancelled" && startsAt < x.EndsAt && endsAt > x.StartsAt);

    private static void ValidateShift(DateTime startsAt, DateTime endsAt)
    {
        if (startsAt >= endsAt) throw new AdvancedOperationsException("Giờ bắt đầu phải trước giờ kết thúc.");
    }

    private Task<bool> IsStaffAsync(int userId) =>
        _db.UserRoles.AnyAsync(x => x.UserId == userId && x.Role.Code == "Staff");
}
