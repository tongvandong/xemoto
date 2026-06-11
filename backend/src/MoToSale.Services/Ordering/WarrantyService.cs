using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Ordering;

public class WarrantyService : IWarrantyService
{
    private static readonly HashSet<string> AllowedStatuses = new()
    {
        "Received",
        "Processing",
        "WaitingParts",
        "Completed",
        "Rejected",
        "Active",
        "Expired",
        "Void",
    };

    private readonly IRepository<Warranty> _warranties;
    private readonly IRepository<WarrantyHistory> _histories;

    public WarrantyService(IRepository<Warranty> warranties, IRepository<WarrantyHistory> histories)
    {
        _warranties = warranties;
        _histories = histories;
    }

    public async Task<PagingResponse<WarrantyDto>> SearchAsync(PagingRequest request, string? status)
    {
        var allWarranties = await _warranties.GetAllAsync();
        IEnumerable<Warranty> query = allWarranties;

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(warranty => warranty.WarrantyStatus == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            query = query.Where(warranty => MatchesKeyword(warranty, request.Keyword));
        }

        var ordered = query.OrderByDescending(warranty => warranty.Id).ToList();
        var items = ordered
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(Map)
            .ToList();

        return new PagingResponse<WarrantyDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = ordered.Count,
        };
    }

    public async Task<WarrantyDetailDto?> GetAsync(int id)
    {
        var warranty = await _warranties.GetByIdAsync(id);
        if (warranty == null)
        {
            return null;
        }

        var histories = await GetHistoriesAsync(id);
        return new WarrantyDetailDto(Map(warranty), histories);
    }

    public async Task<int> CreateAsync(SaveWarrantyRequest request)
    {
        ValidateWarrantyRequest(request);

        DateTime now = DateTime.UtcNow;
        var warranty = CreateWarrantyEntity(request, now);

        _warranties.Add(warranty);
        await _warranties.SaveChangesAsync();

        AddHistory(warranty.Id, null, "Received", request.Note, null, null, now);
        await _histories.SaveChangesAsync();

        return warranty.Id;
    }

    public async Task UpdateAsync(int id, SaveWarrantyRequest request)
    {
        var warranty = await _warranties.GetByIdAsync(id);
        if (warranty == null)
        {
            throw new WarrantyException("Không tìm thấy phiếu bảo hành.");
        }

        if (warranty.WarrantyStatus != "Received")
        {
            throw new WarrantyException("Chỉ sửa được thông tin khi phiếu đang ở trạng thái mới tiếp nhận.");
        }

        ValidateWarrantyRequest(request);
        UpdateWarrantyEntity(warranty, request);

        _warranties.Update(warranty);
        await _warranties.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(int id, UpdateWarrantyStatusRequest request, int? userId)
    {
        if (!AllowedStatuses.Contains(request.Status))
        {
            throw new WarrantyException("Trạng thái bảo hành không hợp lệ.");
        }

        var warranty = await _warranties.GetByIdAsync(id);
        if (warranty == null)
        {
            throw new WarrantyException("Không tìm thấy phiếu bảo hành.");
        }

        string oldStatus = warranty.WarrantyStatus;
        warranty.WarrantyStatus = request.Status;

        if (request.ActualCost.HasValue)
        {
            warranty.ActualCost = request.ActualCost;
        }

        if (!string.IsNullOrWhiteSpace(request.Note))
        {
            warranty.Note = request.Note;
        }

        if (request.Status == "Completed")
        {
            warranty.CompletedAt = DateTime.UtcNow;
        }

        warranty.UpdatedDate = DateTime.UtcNow;

        _warranties.Update(warranty);
        AddHistory(id, oldStatus, request.Status, request.Note, request.ActualCost, userId, DateTime.UtcNow);

        await _warranties.SaveChangesAsync();
    }

    private static bool MatchesKeyword(Warranty warranty, string keyword)
    {
        return warranty.Code.Contains(keyword, StringComparison.OrdinalIgnoreCase)
            || warranty.ProductSnapshot.Contains(keyword, StringComparison.OrdinalIgnoreCase)
            || (warranty.CustomerName?.Contains(keyword, StringComparison.OrdinalIgnoreCase) ?? false)
            || (warranty.CustomerPhone?.Contains(keyword, StringComparison.OrdinalIgnoreCase) ?? false);
    }

    private async Task<IEnumerable<WarrantyHistoryDto>> GetHistoriesAsync(int warrantyId)
    {
        var histories = await _histories.FindAsync(history => history.WarrantyId == warrantyId);

        return histories
            .OrderBy(history => history.CreatedDate)
            .Select(history => new WarrantyHistoryDto(
                history.Id,
                history.FromStatus,
                history.ToStatus,
                history.Note,
                history.ActualCost,
                history.ChangedBy,
                history.CreatedDate));
    }

    private static void ValidateWarrantyRequest(SaveWarrantyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProductSnapshot))
        {
            throw new WarrantyException("Tên sản phẩm là bắt buộc.");
        }

        if (request.Months <= 0)
        {
            throw new WarrantyException("Số tháng bảo hành phải lớn hơn 0.");
        }
    }

    private static Warranty CreateWarrantyEntity(SaveWarrantyRequest request, DateTime now)
    {
        return new Warranty
        {
            Code = $"BH{now:yyyyMMddHHmmssfff}",
            OrderId = request.OrderId,
            SkuId = request.SkuId,
            CustomerId = request.CustomerId,
            ProductSnapshot = request.ProductSnapshot.Trim(),
            SerialNumber = request.SerialNumber,
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            FrameNumber = request.FrameNumber,
            EngineNumber = request.EngineNumber,
            ReportedIssue = request.ReportedIssue ?? string.Empty,
            EstimatedCost = request.EstimatedCost,
            ReceivedAt = now,
            StartAt = request.StartAt ?? now,
            Months = request.Months,
            Note = request.Note,
            WarrantyStatus = "Received",
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
        };
    }

    private static void UpdateWarrantyEntity(Warranty warranty, SaveWarrantyRequest request)
    {
        warranty.OrderId = request.OrderId;
        warranty.SkuId = request.SkuId;
        warranty.CustomerId = request.CustomerId;
        warranty.ProductSnapshot = request.ProductSnapshot.Trim();
        warranty.SerialNumber = request.SerialNumber;
        warranty.CustomerName = request.CustomerName;
        warranty.CustomerPhone = request.CustomerPhone;
        warranty.FrameNumber = request.FrameNumber;
        warranty.EngineNumber = request.EngineNumber;
        warranty.ReportedIssue = request.ReportedIssue ?? string.Empty;
        warranty.EstimatedCost = request.EstimatedCost;
        warranty.Months = request.Months;
        warranty.Note = request.Note;
        warranty.UpdatedDate = DateTime.UtcNow;

        if (request.StartAt.HasValue)
        {
            warranty.StartAt = request.StartAt.Value;
        }
    }

    private void AddHistory(int warrantyId, string? fromStatus, string toStatus, string? note, decimal? actualCost, int? userId, DateTime now)
    {
        _histories.Add(new WarrantyHistory
        {
            WarrantyId = warrantyId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            ActualCost = actualCost,
            ChangedBy = userId,
            CreatedDate = now,
        });
    }

    private static WarrantyDto Map(Warranty warranty)
    {
        return new WarrantyDto(
            warranty.Id,
            warranty.Code,
            warranty.OrderId,
            warranty.SkuId,
            warranty.CustomerId,
            warranty.ProductSnapshot,
            warranty.SerialNumber,
            warranty.CustomerName,
            warranty.CustomerPhone,
            warranty.FrameNumber,
            warranty.EngineNumber,
            warranty.ReportedIssue,
            warranty.EstimatedCost,
            warranty.ActualCost,
            warranty.ReceivedAt,
            warranty.CompletedAt,
            warranty.StartAt,
            warranty.Months,
            warranty.WarrantyStatus,
            warranty.Note,
            warranty.CreatedDate);
    }
}
