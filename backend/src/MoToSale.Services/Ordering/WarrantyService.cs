using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Ordering;

public class WarrantyService : IWarrantyService
{
    private static readonly HashSet<string> Allowed = new() { "Received", "Processing", "WaitingParts", "Completed", "Rejected", "Active", "Expired", "Void" };
    private readonly IRepository<Warranty> _warranties;
    private readonly IRepository<WarrantyHistory> _histories;

    public WarrantyService(IRepository<Warranty> warranties, IRepository<WarrantyHistory> histories)
    {
        _warranties = warranties;
        _histories = histories;
    }

    public async Task<PagingResponse<WarrantyDto>> SearchAsync(PagingRequest r, string? status)
    {
        var all = await _warranties.GetAllAsync();
        var q = all.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(w => w.WarrantyStatus == status);
        if (!string.IsNullOrWhiteSpace(r.Keyword))
            q = q.Where(w => w.Code.Contains(r.Keyword!, StringComparison.OrdinalIgnoreCase)
                || w.ProductSnapshot.Contains(r.Keyword!, StringComparison.OrdinalIgnoreCase)
                || (w.CustomerName?.Contains(r.Keyword!, StringComparison.OrdinalIgnoreCase) ?? false)
                || (w.CustomerPhone?.Contains(r.Keyword!, StringComparison.OrdinalIgnoreCase) ?? false));
        var ordered = q.OrderByDescending(w => w.Id).ToList();
        return new PagingResponse<WarrantyDto>
        {
            Items = ordered.Skip((r.Page - 1) * r.PageSize).Take(r.PageSize).Select(Map).ToList(),
            Page = r.Page,
            PageSize = r.PageSize,
            TotalItems = ordered.Count,
        };
    }

    public async Task<WarrantyDetailDto?> GetAsync(int id)
    {
        var w = await _warranties.GetByIdAsync(id);
        if (w is null) return null;
        var histories = (await _histories.FindAsync(x => x.WarrantyId == id)).OrderBy(x => x.CreatedDate)
            .Select(x => new WarrantyHistoryDto(x.Id, x.FromStatus, x.ToStatus, x.Note, x.ActualCost, x.ChangedBy, x.CreatedDate));
        return new WarrantyDetailDto(Map(w), histories);
    }

    public async Task<int> CreateAsync(SaveWarrantyRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.ProductSnapshot)) throw new WarrantyException("Product name is required.");
        if (r.Months <= 0) throw new WarrantyException("Warranty months must be greater than zero.");
        var now = DateTime.UtcNow;
        var w = new Warranty
        {
            Code = $"BH{now:yyyyMMddHHmmssfff}",
            OrderId = r.OrderId,
            SkuId = r.SkuId,
            CustomerId = r.CustomerId,
            ProductSnapshot = r.ProductSnapshot.Trim(),
            SerialNumber = r.SerialNumber,
            CustomerName = r.CustomerName,
            CustomerPhone = r.CustomerPhone,
            FrameNumber = r.FrameNumber,
            EngineNumber = r.EngineNumber,
            ReportedIssue = r.ReportedIssue ?? "",
            EstimatedCost = r.EstimatedCost,
            ReceivedAt = now,
            StartAt = r.StartAt ?? now,
            Months = r.Months,
            Note = r.Note,
            WarrantyStatus = "Received",
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
        };
        _warranties.Add(w);
        await _warranties.SaveChangesAsync();
        _histories.Add(new WarrantyHistory { WarrantyId = w.Id, ToStatus = "Received", Note = r.Note, CreatedDate = now });
        await _histories.SaveChangesAsync();
        return w.Id;
    }

    public async Task UpdateAsync(int id, SaveWarrantyRequest r)
    {
        var w = await _warranties.GetByIdAsync(id) ?? throw new WarrantyException("Không tìm thấy phiếu bảo hành.");
        if (w.WarrantyStatus != "Received")
            throw new WarrantyException("Chỉ sửa được thông tin khi phiếu đang ở trạng thái mới tiếp nhận.");
        if (string.IsNullOrWhiteSpace(r.ProductSnapshot)) throw new WarrantyException("Tên sản phẩm là bắt buộc.");
        if (r.Months <= 0) throw new WarrantyException("Số tháng bảo hành phải lớn hơn 0.");
        w.OrderId = r.OrderId;
        w.SkuId = r.SkuId;
        w.CustomerId = r.CustomerId;
        w.ProductSnapshot = r.ProductSnapshot.Trim();
        w.SerialNumber = r.SerialNumber;
        w.CustomerName = r.CustomerName;
        w.CustomerPhone = r.CustomerPhone;
        w.FrameNumber = r.FrameNumber;
        w.EngineNumber = r.EngineNumber;
        w.ReportedIssue = r.ReportedIssue ?? "";
        w.EstimatedCost = r.EstimatedCost;
        if (r.StartAt.HasValue) w.StartAt = r.StartAt.Value;
        w.Months = r.Months;
        w.Note = r.Note;
        w.UpdatedDate = DateTime.UtcNow;
        _warranties.Update(w);
        await _warranties.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(int id, UpdateWarrantyStatusRequest request, int? userId)
    {
        if (!Allowed.Contains(request.Status)) throw new WarrantyException("Invalid warranty status.");
        var w = await _warranties.GetByIdAsync(id) ?? throw new WarrantyException("Warranty not found.");
        var from = w.WarrantyStatus;
        w.WarrantyStatus = request.Status;
        if (request.ActualCost.HasValue) w.ActualCost = request.ActualCost;
        if (!string.IsNullOrWhiteSpace(request.Note)) w.Note = request.Note;
        if (request.Status == "Completed") w.CompletedAt = DateTime.UtcNow;
        w.UpdatedDate = DateTime.UtcNow;
        _warranties.Update(w);
        _histories.Add(new WarrantyHistory
        {
            WarrantyId = id, FromStatus = from, ToStatus = request.Status, Note = request.Note,
            ActualCost = request.ActualCost, ChangedBy = userId, CreatedDate = DateTime.UtcNow,
        });
        await _warranties.SaveChangesAsync();
    }

    private static WarrantyDto Map(Warranty w) => new(
        w.Id, w.Code, w.OrderId, w.SkuId, w.CustomerId, w.ProductSnapshot, w.SerialNumber,
        w.CustomerName, w.CustomerPhone, w.FrameNumber, w.EngineNumber, w.ReportedIssue,
        w.EstimatedCost, w.ActualCost, w.ReceivedAt, w.CompletedAt, w.StartAt, w.Months, w.WarrantyStatus, w.Note, w.CreatedDate);
}
