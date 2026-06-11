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
    public async Task<ItemsResponse<RepairOrderDto>> GetRepairsAsync()
    {
        List<RepairOrderDto> repairs = await GetRepairRowsAsync();
        List<int> repairIds = repairs.Select(repair => repair.Id).ToList();

        List<RepairOrderLineWithRepairId> lineRows = await GetRepairLineRowsAsync(repairIds);
        List<RepairHistoryWithRepairId> historyRows = await GetRepairHistoryRowsAsync(repairIds);

        foreach (RepairOrderDto repair in repairs)
        {
            repair.Lines = lineRows
                .Where(row => row.RepairOrderId == repair.Id)
                .Select(row => row.Line)
                .ToList();

            repair.Histories = historyRows
                .Where(row => row.RepairOrderId == repair.Id)
                .Select(row => row.History)
                .ToList();
        }

        return new ItemsResponse<RepairOrderDto> { Items = repairs };
    }

    public async Task<int> CreateRepairAsync(CreateRepairOrderRequest request)
    {
        await ValidateRepairRequestAsync(request);

        DateTime now = DateTime.UtcNow;
        var repair = new RepairOrder
        {
            Code = $"RO{now:yyyyMMddHHmmssfff}",
            CustomerId = request.CustomerId,
            AssignedStaffId = request.AssignedStaffId,
            WarrantyId = request.WarrantyId,
            VehicleDescription = request.VehicleDescription,
            ReportedIssue = request.ReportedIssue,
            LaborCost = request.LaborCost,
            Note = request.Note,
            ReceivedAt = now,
            CreatedDate = now
        };

        foreach (RepairLineRequest line in request.Lines ?? new List<RepairLineRequest>())
        {
            repair.Lines.Add(new RepairOrderLine
            {
                SkuId = line.SkuId,
                Description = line.Description,
                Qty = line.Qty,
                UnitPrice = line.UnitPrice,
                CreatedDate = now
            });
        }

        repair.PartsCost = repair.Lines.Sum(line => line.Qty * line.UnitPrice);
        _db.RepairOrders.Add(repair);
        await _db.SaveChangesAsync();

        _db.RepairStatusHistories.Add(new RepairStatusHistory
        {
            RepairOrderId = repair.Id,
            ToStatus = repair.RepairStatus,
            Note = "Tiếp nhận phiếu sửa chữa",
            ChangedAt = now,
            CreatedDate = now
        });

        await _db.SaveChangesAsync();
        return repair.Id;
    }

    public async Task UpdateRepairAsync(int id, CreateRepairOrderRequest request)
    {
        RepairOrder repair = await _db.RepairOrders
            .Include(row => row.Lines)
            .FirstOrDefaultAsync(row => row.Id == id)
            ?? throw new BusinessOperationsException("Không tìm thấy phiếu sửa chữa.");

        if (repair.RepairStatus != "Received")
        {
            throw new BusinessOperationsException("Chỉ sửa được thông tin khi phiếu đang ở trạng thái mới tiếp nhận.");
        }

        await ValidateRepairRequestAsync(request);
        ApplyRepairRequest(repair, request);

        DateTime now = DateTime.UtcNow;
        _db.RepairOrderLines.RemoveRange(repair.Lines);

        List<RepairOrderLine> newLines = BuildRepairLines(id, request.Lines, now);
        _db.RepairOrderLines.AddRange(newLines);

        repair.PartsCost = newLines.Sum(line => line.Qty * line.UnitPrice);
        repair.UpdatedDate = now;

        await _db.SaveChangesAsync();
    }

    public async Task UpdateRepairStatusAsync(int id, UpdateRepairStatusRequest request)
    {
        RepairOrder repair = await _db.RepairOrders.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy phiếu sửa chữa.");

        ValidateRepairStatusTransition(repair.RepairStatus, request.Status);

        DateTime now = DateTime.UtcNow;
        string fromStatus = repair.RepairStatus;

        if (request.Status == "Repairing" && !repair.PartsIssued)
        {
            await IssueRepairPartsAsync(repair, now);
        }

        repair.RepairStatus = request.Status;
        repair.Note = request.Note ?? repair.Note;
        repair.CompletedAt = IsRepairCompletedStatus(request.Status) ? now : repair.CompletedAt;
        repair.UpdatedDate = now;

        _db.RepairStatusHistories.Add(new RepairStatusHistory
        {
            RepairOrderId = repair.Id,
            FromStatus = fromStatus,
            ToStatus = request.Status,
            Note = request.Note,
            ChangedAt = now,
            CreatedDate = now
        });

        await _db.SaveChangesAsync();
    }
    private async Task<List<RepairOrderDto>> GetRepairRowsAsync()
    {
        return await (from repair in _db.RepairOrders.AsNoTracking()
                      join customer in _db.Users.AsNoTracking() on repair.CustomerId equals customer.Id
                      orderby repair.Id descending
                      select new RepairOrderDto
                      {
                          Id = repair.Id,
                          Code = repair.Code,
                          CustomerId = repair.CustomerId,
                          CustomerName = customer.FullName,
                          AssignedStaffId = repair.AssignedStaffId,
                          VehicleDescription = repair.VehicleDescription,
                          ReportedIssue = repair.ReportedIssue,
                          RepairStatus = repair.RepairStatus,
                          LaborCost = repair.LaborCost,
                          PartsCost = repair.PartsCost,
                          Total = repair.LaborCost + repair.PartsCost,
                          ReceivedAt = repair.ReceivedAt,
                          CompletedAt = repair.CompletedAt,
                          Note = repair.Note
                      })
            .ToListAsync();
    }

    private async Task<List<RepairOrderLineWithRepairId>> GetRepairLineRowsAsync(List<int> repairIds)
    {
        return await _db.RepairOrderLines
            .AsNoTracking()
            .Where(line => repairIds.Contains(line.RepairOrderId))
            .Select(line => new RepairOrderLineWithRepairId
            {
                RepairOrderId = line.RepairOrderId,
                Line = new RepairOrderLineDto
                {
                    Id = line.Id,
                    SkuId = line.SkuId,
                    Description = line.Description,
                    Qty = line.Qty,
                    UnitPrice = line.UnitPrice
                }
            })
            .ToListAsync();
    }

    private async Task<List<RepairHistoryWithRepairId>> GetRepairHistoryRowsAsync(List<int> repairIds)
    {
        return await _db.RepairStatusHistories
            .AsNoTracking()
            .Where(history => repairIds.Contains(history.RepairOrderId))
            .OrderBy(history => history.ChangedAt)
            .Select(history => new RepairHistoryWithRepairId
            {
                RepairOrderId = history.RepairOrderId,
                History = new RepairHistoryDto
                {
                    Id = history.Id,
                    FromStatus = history.FromStatus,
                    ToStatus = history.ToStatus,
                    Note = history.Note,
                    ChangedAt = history.ChangedAt
                }
            })
            .ToListAsync();
    }

    private async Task ValidateRepairRequestAsync(CreateRepairOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.VehicleDescription) || string.IsNullOrWhiteSpace(request.ReportedIssue))
        {
            throw new BusinessOperationsException("Thông tin xe và mô tả lỗi là bắt buộc.");
        }

        if (!await HasRoleAsync(request.CustomerId, "Customer"))
        {
            throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        }

        if (request.AssignedStaffId.HasValue && !await HasRoleAsync(request.AssignedStaffId.Value, "Staff"))
        {
            throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        }

        List<RepairLineRequest> lines = request.Lines ?? new List<RepairLineRequest>();
        bool hasInvalidLine = lines.Any(line => line.Qty <= 0 || line.UnitPrice < 0);

        if (request.LaborCost < 0 || hasInvalidLine)
        {
            throw new BusinessOperationsException("Chi phí hoặc phụ tùng sửa chữa không hợp lệ.");
        }
    }

    private static void ApplyRepairRequest(RepairOrder repair, CreateRepairOrderRequest request)
    {
        repair.CustomerId = request.CustomerId;
        repair.AssignedStaffId = request.AssignedStaffId;
        repair.WarrantyId = request.WarrantyId;
        repair.VehicleDescription = request.VehicleDescription;
        repair.ReportedIssue = request.ReportedIssue;
        repair.LaborCost = request.LaborCost;
        repair.Note = request.Note;
    }

    private static List<RepairOrderLine> BuildRepairLines(int repairId, List<RepairLineRequest>? requestLines, DateTime now)
    {
        List<RepairOrderLine> lines = new List<RepairOrderLine>();

        foreach (RepairLineRequest requestLine in requestLines ?? new List<RepairLineRequest>())
        {
            lines.Add(new RepairOrderLine
            {
                RepairOrderId = repairId,
                SkuId = requestLine.SkuId,
                Description = requestLine.Description,
                Qty = requestLine.Qty,
                UnitPrice = requestLine.UnitPrice,
                CreatedDate = now
            });
        }

        return lines;
    }

    private static void ValidateRepairStatusTransition(string currentStatus, string nextStatus)
    {
        Dictionary<string, string[]> transitions = new Dictionary<string, string[]>
        {
            ["Received"] = new[] { "Inspecting", "Cancelled" },
            ["Inspecting"] = new[] { "Quoted", "Cancelled" },
            ["Quoted"] = new[] { "Repairing", "Cancelled" },
            ["Repairing"] = new[] { "Completed" },
            ["Completed"] = new[] { "Delivered" }
        };

        bool hasTransition = transitions.TryGetValue(currentStatus, out string[]? nextStatuses);
        bool canMove = hasTransition && nextStatuses!.Contains(nextStatus);

        if (!canMove)
        {
            throw new BusinessOperationsException("Không thể chuyển sang trạng thái sửa chữa đã chọn.");
        }
    }

    private async Task IssueRepairPartsAsync(RepairOrder repair, DateTime now)
    {
        List<RepairOrderLine> lines = await _db.RepairOrderLines
            .Where(line => line.RepairOrderId == repair.Id && line.SkuId.HasValue)
            .ToListAsync();

        foreach (RepairOrderLine line in lines)
        {
            InventoryItem inventory = await _db.InventoryItems.FirstOrDefaultAsync(item => item.SkuId == line.SkuId)
                ?? throw new BusinessOperationsException("Không có tồn kho cho phụ tùng sửa chữa.");

            if (inventory.OnHand - inventory.Reserved < line.Qty)
            {
                throw new BusinessOperationsException("Không đủ tồn kho phụ tùng sửa chữa.");
            }

            inventory.OnHand -= line.Qty;
            inventory.UpdatedDate = now;

            _db.StockMovements.Add(new StockMovement
            {
                SkuId = line.SkuId!.Value,
                Type = (int)StockMovementType.Issue,
                QtyDelta = -line.Qty,
                BalanceAfter = inventory.OnHand,
                RefType = "RepairOrder",
                RefId = repair.Id,
                Reason = repair.Code,
                OccurredAt = now,
                CreatedDate = now
            });
        }

        repair.PartsIssued = true;
    }

    private static bool IsRepairCompletedStatus(string status)
    {
        return status == "Completed" || status == "Delivered";
    }
    private sealed class RepairOrderLineWithRepairId
    {
        public int RepairOrderId { get; set; }
        public RepairOrderLineDto Line { get; set; } = new RepairOrderLineDto();
    }

    private sealed class RepairHistoryWithRepairId
    {
        public int RepairOrderId { get; set; }
        public RepairHistoryDto History { get; set; } = new RepairHistoryDto();
    }
}
