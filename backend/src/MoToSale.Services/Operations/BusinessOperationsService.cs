using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public class BusinessOperationsService : IBusinessOperationsService
{
    private readonly AppDbContext _db;
    public BusinessOperationsService(AppDbContext db) => _db = db;

    public async Task<object> GetLookupsAsync()
    {
        var delivered = await _db.Orders.AsNoTracking().Where(x => x.OrderStatus == OrderStatus.Delivered)
            .OrderByDescending(x => x.Id).Select(x => new { x.Id, x.Code, x.UserId, x.GrandTotal, lines = x.Lines.Select(l => new { l.Id, l.SkuId, l.ProductNameSnapshot, l.SkuCodeSnapshot, l.Qty, l.UnitPrice }) }).ToListAsync();
        var users = await _db.Users.AsNoTracking().OrderBy(x => x.FullName).Select(x => new { x.Id, x.FullName, x.Email, x.PhoneNumber }).ToListAsync();
        var staffIds = await _db.UserRoles.AsNoTracking().Where(x => x.Role.Code == "Staff").Select(x => x.UserId).Distinct().ToListAsync();
        var customerIds = await _db.UserRoles.AsNoTracking().Where(x => x.Role.Code == "Customer").Select(x => x.UserId).Distinct().ToListAsync();
        return new
        {
            skus = await _db.Skus.AsNoTracking().OrderBy(x => x.SkuCode).Select(x => new { x.Id, x.SkuCode, x.VariantName, productName = x.Product.Name }).ToListAsync(),
            suppliers = await _db.Suppliers.AsNoTracking().Where(x => x.Status == 1).OrderBy(x => x.Name).Select(x => new { x.Id, x.Code, x.Name }).ToListAsync(),
            customers = users.Where(x => customerIds.Contains(x.Id)),
            staff = users.Where(x => staffIds.Contains(x.Id)),
            orders = delivered,
        };
    }

    public async Task<object> GetSuppliersAsync() => new { items = await _db.Suppliers.AsNoTracking().OrderBy(x => x.Name).ToListAsync() };

    public async Task<int> SaveSupplierAsync(int? id, SupplierRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Code) || string.IsNullOrWhiteSpace(r.Name)) throw new BusinessOperationsException("Mã và tên nhà cung cấp là bắt buộc.");
        var code = r.Code.Trim().ToUpperInvariant();
        if (await _db.Suppliers.AnyAsync(x => x.Code == code && (!id.HasValue || x.Id != id))) throw new BusinessOperationsException("Mã nhà cung cấp đã tồn tại.");
        var row = id.HasValue ? await _db.Suppliers.FindAsync(id.Value) ?? throw new BusinessOperationsException("Không tìm thấy nhà cung cấp.") : new Supplier { CreatedDate = DateTime.UtcNow };
        row.Code = code; row.Name = r.Name.Trim(); row.TaxCode = r.TaxCode?.Trim(); row.ContactName = r.ContactName?.Trim();
        row.Phone = r.Phone?.Trim(); row.Email = r.Email?.Trim(); row.Address = r.Address?.Trim(); row.Note = r.Note?.Trim(); row.Status = r.Status; row.UpdatedDate = DateTime.UtcNow;
        if (!id.HasValue) _db.Suppliers.Add(row);
        await _db.SaveChangesAsync();
        return row.Id;
    }

    public async Task<object> GetPurchaseOrdersAsync() => new { items = await _db.PurchaseOrders.AsNoTracking().Include(x => x.Supplier).Include(x => x.Lines).OrderByDescending(x => x.Id)
        .Select(x => new { x.Id, x.Code, supplierName = x.Supplier.Name, x.PurchaseStatus, x.TotalAmount, x.PaidAmount, outstanding = x.TotalAmount - x.PaidAmount, x.Note, x.CreatedDate,
            lines = x.Lines.Select(l => new { l.Id, l.SkuId, skuCode = _db.Skus.Where(s => s.Id == l.SkuId).Select(s => s.SkuCode).FirstOrDefault(), productName = _db.Skus.Where(s => s.Id == l.SkuId).Select(s => s.Product.Name).FirstOrDefault(), l.OrderedQty, l.ReceivedQty, l.UnitCost }) }).ToListAsync() };

    public async Task<int> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest r, int? userId)
    {
        if (!await _db.Suppliers.AnyAsync(x => x.Id == r.SupplierId && x.Status == 1)) throw new BusinessOperationsException("Nhà cung cấp không hợp lệ.");
        if (r.Lines is null || r.Lines.Count == 0 || r.Lines.Any(x => x.Qty <= 0 || x.UnitCost < 0)) throw new BusinessOperationsException("Đơn mua phải có dòng hàng hợp lệ.");
        if (r.Lines.Select(x => x.SkuId).Distinct().Count() != r.Lines.Count) throw new BusinessOperationsException("Một SKU chỉ được thêm một lần trong đơn mua.");
        var skuIds = r.Lines.Select(x => x.SkuId).Distinct().ToList();
        if (await _db.Skus.CountAsync(x => skuIds.Contains(x.Id)) != skuIds.Count) throw new BusinessOperationsException("Đơn mua có SKU không tồn tại.");
        var now = DateTime.UtcNow;
        var row = new PurchaseOrder { Code = $"PO{now:yyyyMMddHHmmssfff}", SupplierId = r.SupplierId, Note = r.Note, CreatedBy = userId, CreatedDate = now,
            Lines = r.Lines.Select(x => new PurchaseOrderLine { SkuId = x.SkuId, OrderedQty = x.Qty, UnitCost = x.UnitCost, CreatedDate = now }).ToList() };
        row.TotalAmount = row.Lines.Sum(x => x.OrderedQty * x.UnitCost);
        _db.PurchaseOrders.Add(row); await _db.SaveChangesAsync(); return row.Id;
    }

    public async Task ApprovePurchaseOrderAsync(int id, int? userId)
    {
        var row = await _db.PurchaseOrders.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");
        if (row.PurchaseStatus != "Draft") throw new BusinessOperationsException("Chỉ đơn nháp mới được duyệt.");
        row.PurchaseStatus = "Approved"; row.ApprovedBy = userId; row.ApprovedAt = DateTime.UtcNow; row.UpdatedDate = DateTime.UtcNow; await _db.SaveChangesAsync();
    }

    public async Task CancelPurchaseOrderAsync(int id)
    {
        var row = await _db.PurchaseOrders.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");
        if (row.PurchaseStatus is "Received" or "PartiallyReceived") throw new BusinessOperationsException("Không thể hủy đơn đã nhận hàng.");
        if (row.PaidAmount > 0) throw new BusinessOperationsException("Không thể hủy đơn đã thanh toán. Hãy xử lý hoàn tiền NCC trước.");
        row.PurchaseStatus = "Cancelled"; row.UpdatedDate = DateTime.UtcNow; await _db.SaveChangesAsync();
    }

    public async Task<int> ReceivePurchaseOrderAsync(int id, ReceivePurchaseOrderRequest r, int? userId)
    {
        var row = await _db.PurchaseOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id) ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");
        if (row.PurchaseStatus is not ("Approved" or "PartiallyReceived")) throw new BusinessOperationsException("Đơn mua chưa sẵn sàng nhận hàng.");
        if (r.Lines is null || r.Lines.Count == 0) throw new BusinessOperationsException("Phiếu nhận phải có hàng.");
        var now = DateTime.UtcNow;
        var receipt = new GoodsReceipt { Code = $"GR{now:yyyyMMddHHmmssfff}", PurchaseOrderId = id, Note = r.Note, ReceivedBy = userId, ReceivedAt = now, CreatedDate = now };
        foreach (var item in r.Lines)
        {
            var line = row.Lines.FirstOrDefault(x => x.Id == item.PurchaseOrderLineId) ?? throw new BusinessOperationsException("Dòng đơn mua không hợp lệ.");
            if (item.Qty <= 0 || line.ReceivedQty + item.Qty > line.OrderedQty) throw new BusinessOperationsException("Số lượng nhận vượt số lượng còn lại.");
            line.ReceivedQty += item.Qty;
            receipt.Lines.Add(new GoodsReceiptLine { PurchaseOrderLineId = line.Id, SkuId = line.SkuId, Qty = item.Qty, UnitCost = line.UnitCost, CreatedDate = now });
            var inv = await _db.InventoryItems.FirstOrDefaultAsync(x => x.SkuId == line.SkuId);
            if (inv is null) { inv = new InventoryItem { SkuId = line.SkuId, CreatedDate = now }; _db.InventoryItems.Add(inv); }
            inv.OnHand += item.Qty; inv.UpdatedDate = now;
            _db.StockMovements.Add(new StockMovement { SkuId = line.SkuId, Type = (int)StockMovementType.Receipt, QtyDelta = item.Qty, BalanceAfter = inv.OnHand, RefType = "GoodsReceipt", Reason = receipt.Code, PerformedBy = userId, OccurredAt = now, CreatedDate = now });
        }
        _db.GoodsReceipts.Add(receipt);
        row.PurchaseStatus = row.Lines.All(x => x.ReceivedQty == x.OrderedQty) ? "Received" : "PartiallyReceived"; row.UpdatedDate = now;
        await _db.SaveChangesAsync(); return receipt.Id;
    }

    public async Task<int> PayPurchaseOrderAsync(int id, PayPurchaseOrderRequest r, int? userId)
    {
        var row = await _db.PurchaseOrders.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");
        if (row.PurchaseStatus == "Cancelled" || r.Amount <= 0 || row.PaidAmount + r.Amount > row.TotalAmount) throw new BusinessOperationsException("Số tiền thanh toán không hợp lệ.");
        var now = DateTime.UtcNow; row.PaidAmount += r.Amount; row.UpdatedDate = now;
        var cash = new CashTransaction { Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = "Payment", Category = "SupplierPayment", Amount = r.Amount, Method = r.Method, ReferenceType = "PurchaseOrder", ReferenceId = id, Note = r.Note, RecordedBy = userId, OccurredAt = now, CreatedDate = now };
        _db.CashTransactions.Add(cash); await _db.SaveChangesAsync(); return cash.Id;
    }

    public async Task<object> GetCashTransactionsAsync() => new { items = await _db.CashTransactions.AsNoTracking().OrderByDescending(x => x.Id).ToListAsync() };
    public async Task<int> CreateCashTransactionAsync(CashTransactionRequest r, int? userId)
    {
        if (r.TransactionType is not ("Receipt" or "Payment") || r.Amount <= 0) throw new BusinessOperationsException("Phiếu thu chi không hợp lệ.");
        if (r.Method is not ("Cash" or "BankTransfer")) throw new BusinessOperationsException("Hình thức thanh toán không hợp lệ.");
        if (string.IsNullOrWhiteSpace(r.Category)) throw new BusinessOperationsException("Nhóm thu chi là bắt buộc.");
        var now = DateTime.UtcNow; var row = new CashTransaction { Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = r.TransactionType, Category = r.Category, Amount = r.Amount, Method = r.Method, ReferenceType = r.ReferenceType, ReferenceId = r.ReferenceId, Note = r.Note, RecordedBy = userId, OccurredAt = r.OccurredAt ?? now, CreatedDate = now };
        _db.CashTransactions.Add(row); await _db.SaveChangesAsync(); return row.Id;
    }
    public async Task<int> ReverseCashTransactionAsync(int id, int? userId)
    {
        var source = await _db.CashTransactions.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy phiếu thu chi.");
        if (await _db.CashTransactions.AnyAsync(x => x.ReferenceType == "CashReversal" && x.ReferenceId == id)) throw new BusinessOperationsException("Phiếu thu chi đã được đảo.");
        var now = DateTime.UtcNow;
        var row = new CashTransaction { Code = $"CT{now:yyyyMMddHHmmssfff}", TransactionType = source.TransactionType == "Receipt" ? "Payment" : "Receipt", Category = "Reversal", Amount = source.Amount, Method = source.Method, ReferenceType = "CashReversal", ReferenceId = id, Note = $"Đảo phiếu {source.Code}", RecordedBy = userId, OccurredAt = now, CreatedDate = now };
        _db.CashTransactions.Add(row); await _db.SaveChangesAsync(); return row.Id;
    }

    public async Task<object> GetRepairsAsync()
    {
        var rows = await (from x in _db.RepairOrders.AsNoTracking()
            join c in _db.Users.AsNoTracking() on x.CustomerId equals c.Id
            orderby x.Id descending
            select new { x.Id, x.Code, x.CustomerId, customerName = c.FullName, x.AssignedStaffId, x.VehicleDescription, x.ReportedIssue, x.RepairStatus, x.LaborCost, x.PartsCost, total = x.LaborCost + x.PartsCost, x.ReceivedAt, x.CompletedAt, x.Note }).ToListAsync();
        var ids = rows.Select(x => x.Id).ToList();
        var lines = await _db.RepairOrderLines.AsNoTracking().Where(x => ids.Contains(x.RepairOrderId)).ToListAsync();
        var histories = await _db.RepairStatusHistories.AsNoTracking().Where(x => ids.Contains(x.RepairOrderId)).OrderBy(x => x.ChangedAt).ToListAsync();
        return new
        {
            items = rows.Select(x => new
            {
                x.Id, x.Code, x.CustomerId, x.customerName, x.AssignedStaffId, x.VehicleDescription, x.ReportedIssue, x.RepairStatus, x.LaborCost, x.PartsCost, x.total, x.ReceivedAt, x.CompletedAt, x.Note,
                lines = lines.Where(line => line.RepairOrderId == x.Id).Select(line => new { line.Id, line.SkuId, line.Description, line.Qty, line.UnitPrice }),
                histories = histories.Where(history => history.RepairOrderId == x.Id).Select(history => new { history.Id, history.FromStatus, history.ToStatus, history.Note, history.ChangedAt }),
            })
        };
    }
    public async Task<int> CreateRepairAsync(CreateRepairOrderRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.VehicleDescription) || string.IsNullOrWhiteSpace(r.ReportedIssue)) throw new BusinessOperationsException("Thông tin xe và mô tả lỗi là bắt buộc.");
        if (!await HasRoleAsync(r.CustomerId, "Customer")) throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        if (r.AssignedStaffId.HasValue && !await HasRoleAsync(r.AssignedStaffId.Value, "Staff")) throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        if (r.LaborCost < 0 || (r.Lines ?? []).Any(x => x.Qty <= 0 || x.UnitPrice < 0)) throw new BusinessOperationsException("Chi phí hoặc phụ tùng sửa chữa không hợp lệ.");
        var now = DateTime.UtcNow; var row = new RepairOrder { Code = $"RO{now:yyyyMMddHHmmssfff}", CustomerId = r.CustomerId, AssignedStaffId = r.AssignedStaffId, WarrantyId = r.WarrantyId, VehicleDescription = r.VehicleDescription, ReportedIssue = r.ReportedIssue, LaborCost = r.LaborCost, Note = r.Note, ReceivedAt = now, CreatedDate = now, Lines = (r.Lines ?? []).Select(x => new RepairOrderLine { SkuId = x.SkuId, Description = x.Description, Qty = x.Qty, UnitPrice = x.UnitPrice, CreatedDate = now }).ToList() };
        row.PartsCost = row.Lines.Sum(x => x.Qty * x.UnitPrice); _db.RepairOrders.Add(row); await _db.SaveChangesAsync();
        _db.RepairStatusHistories.Add(new RepairStatusHistory { RepairOrderId = row.Id, ToStatus = row.RepairStatus, Note = "Tiếp nhận phiếu sửa chữa", ChangedAt = now, CreatedDate = now }); await _db.SaveChangesAsync(); return row.Id;
    }
    public async Task UpdateRepairAsync(int id, CreateRepairOrderRequest r)
    {
        var row = await _db.RepairOrders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id) ?? throw new BusinessOperationsException("Không tìm thấy phiếu sửa chữa.");
        if (row.RepairStatus != "Received") throw new BusinessOperationsException("Chỉ sửa được thông tin khi phiếu đang ở trạng thái mới tiếp nhận.");
        if (string.IsNullOrWhiteSpace(r.VehicleDescription) || string.IsNullOrWhiteSpace(r.ReportedIssue)) throw new BusinessOperationsException("Thông tin xe và mô tả lỗi là bắt buộc.");
        if (!await HasRoleAsync(r.CustomerId, "Customer")) throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        if (r.AssignedStaffId.HasValue && !await HasRoleAsync(r.AssignedStaffId.Value, "Staff")) throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        if (r.LaborCost < 0 || (r.Lines ?? []).Any(x => x.Qty <= 0 || x.UnitPrice < 0)) throw new BusinessOperationsException("Chi phí hoặc phụ tùng sửa chữa không hợp lệ.");
        var now = DateTime.UtcNow;
        row.CustomerId = r.CustomerId; row.AssignedStaffId = r.AssignedStaffId; row.WarrantyId = r.WarrantyId;
        row.VehicleDescription = r.VehicleDescription; row.ReportedIssue = r.ReportedIssue; row.LaborCost = r.LaborCost; row.Note = r.Note;
        _db.RepairOrderLines.RemoveRange(row.Lines);
        var newLines = (r.Lines ?? new()).Select(x => new RepairOrderLine { RepairOrderId = id, SkuId = x.SkuId, Description = x.Description, Qty = x.Qty, UnitPrice = x.UnitPrice, CreatedDate = now }).ToList();
        _db.RepairOrderLines.AddRange(newLines);
        row.PartsCost = newLines.Sum(x => x.Qty * x.UnitPrice);
        row.UpdatedDate = now;
        await _db.SaveChangesAsync();
    }

    public async Task UpdateRepairStatusAsync(int id, UpdateRepairStatusRequest r)
    {
        var transitions = new Dictionary<string, string[]>
        {
            ["Received"] = ["Inspecting", "Cancelled"],
            ["Inspecting"] = ["Quoted", "Cancelled"],
            ["Quoted"] = ["Repairing", "Cancelled"],
            ["Repairing"] = ["Completed"],
            ["Completed"] = ["Delivered"],
        };
        var row = await _db.RepairOrders.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy phiếu sửa chữa.");
        if (!transitions.TryGetValue(row.RepairStatus, out var nextStatuses) || !nextStatuses.Contains(r.Status)) throw new BusinessOperationsException("Không thể chuyển sang trạng thái sửa chữa đã chọn.");
        var now = DateTime.UtcNow; var from = row.RepairStatus;
        if (r.Status == "Repairing" && !row.PartsIssued)
        {
            var lines = await _db.RepairOrderLines.Where(x => x.RepairOrderId == id && x.SkuId.HasValue).ToListAsync();
            foreach (var line in lines)
            {
                var inv = await _db.InventoryItems.FirstOrDefaultAsync(x => x.SkuId == line.SkuId) ?? throw new BusinessOperationsException("Không có tồn kho cho phụ tùng sửa chữa.");
                if (inv.OnHand - inv.Reserved < line.Qty) throw new BusinessOperationsException("Không đủ tồn kho phụ tùng sửa chữa.");
                inv.OnHand -= line.Qty; inv.UpdatedDate = now;
                _db.StockMovements.Add(new StockMovement { SkuId = line.SkuId!.Value, Type = (int)StockMovementType.Issue, QtyDelta = -line.Qty, BalanceAfter = inv.OnHand, RefType = "RepairOrder", RefId = row.Id, Reason = row.Code, OccurredAt = now, CreatedDate = now });
            }
            row.PartsIssued = true;
        }
        row.RepairStatus = r.Status; row.Note = r.Note ?? row.Note; row.CompletedAt = r.Status is "Completed" or "Delivered" ? now : row.CompletedAt; row.UpdatedDate = now;
        _db.RepairStatusHistories.Add(new RepairStatusHistory { RepairOrderId = row.Id, FromStatus = from, ToStatus = r.Status, Note = r.Note, ChangedAt = now, CreatedDate = now });
        await _db.SaveChangesAsync();
    }

    public async Task<object> GetInteractionsAsync() => new { items = await (from x in _db.CustomerInteractions.AsNoTracking()
        join c in _db.Users.AsNoTracking() on x.CustomerId equals c.Id
        join staff in _db.Users.AsNoTracking() on x.AssignedStaffId equals staff.Id into staffRows
        from staff in staffRows.DefaultIfEmpty()
        orderby x.Id descending
        select new { x.Id, x.CustomerId, customerName = c.FullName, x.AssignedStaffId, staffName = staff == null ? null : staff.FullName, x.InteractionType, x.InteractionStatus, x.Subject, x.Note, x.FollowUpAt, x.CompletedAt, x.CreatedDate }).ToListAsync() };
    public async Task<int> CreateInteractionAsync(CustomerInteractionRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Subject)) throw new BusinessOperationsException("Nội dung chăm sóc là bắt buộc.");
        if (!await HasRoleAsync(r.CustomerId, "Customer")) throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        if (r.AssignedStaffId.HasValue && !await HasRoleAsync(r.AssignedStaffId.Value, "Staff")) throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        if (r.InteractionType is not ("Call" or "Email" or "Visit" or "Message")) throw new BusinessOperationsException("Loại chăm sóc khách hàng không hợp lệ.");
        var row = new CustomerInteraction { CustomerId = r.CustomerId, AssignedStaffId = r.AssignedStaffId, InteractionType = r.InteractionType, Subject = r.Subject, Note = r.Note, FollowUpAt = r.FollowUpAt, CreatedDate = DateTime.UtcNow };
        _db.CustomerInteractions.Add(row); await _db.SaveChangesAsync(); return row.Id;
    }
    public async Task UpdateInteractionAsync(int id, CustomerInteractionRequest r)
    {
        var row = await _db.CustomerInteractions.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");
        if (row.InteractionStatus != "Open") throw new BusinessOperationsException("Chỉ lịch đang mở mới được cập nhật.");
        if (string.IsNullOrWhiteSpace(r.Subject)) throw new BusinessOperationsException("Nội dung chăm sóc là bắt buộc.");
        if (!await HasRoleAsync(r.CustomerId, "Customer")) throw new BusinessOperationsException("Khách hàng không hợp lệ.");
        if (r.AssignedStaffId.HasValue && !await HasRoleAsync(r.AssignedStaffId.Value, "Staff")) throw new BusinessOperationsException("Nhân viên phụ trách không hợp lệ.");
        if (r.InteractionType is not ("Call" or "Email" or "Visit" or "Message")) throw new BusinessOperationsException("Loại chăm sóc khách hàng không hợp lệ.");
        row.CustomerId = r.CustomerId; row.AssignedStaffId = r.AssignedStaffId; row.InteractionType = r.InteractionType; row.Subject = r.Subject; row.Note = r.Note; row.FollowUpAt = r.FollowUpAt; row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
    public async Task CompleteInteractionAsync(int id)
    {
        var row = await _db.CustomerInteractions.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");
        row.InteractionStatus = "Completed"; row.CompletedAt = DateTime.UtcNow; row.UpdatedDate = DateTime.UtcNow; await _db.SaveChangesAsync();
    }
    public async Task CancelInteractionAsync(int id)
    {
        var row = await _db.CustomerInteractions.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy lịch chăm sóc.");
        if (row.InteractionStatus != "Open") throw new BusinessOperationsException("Chỉ lịch đang mở mới được hủy.");
        row.InteractionStatus = "Cancelled"; row.UpdatedDate = DateTime.UtcNow; await _db.SaveChangesAsync();
    }

    public async Task<object> GetAttendanceAsync() => new { items = await (from x in _db.StaffAttendances.AsNoTracking()
        join u in _db.Users.AsNoTracking() on x.StaffUserId equals u.Id
        orderby x.CheckInAt descending
        select new { x.Id, x.StaffUserId, staffName = u.FullName, x.CheckInAt, x.CheckOutAt, x.Note }).ToListAsync() };
    public async Task<int> CheckInAsync(AttendanceRequest r)
    {
        if (!await HasRoleAsync(r.StaffUserId, "Staff")) throw new BusinessOperationsException("Nhân viên không hợp lệ.");
        if (await _db.StaffAttendances.AnyAsync(x => x.StaffUserId == r.StaffUserId && x.CheckOutAt == null)) throw new BusinessOperationsException("Nhân viên đang có ca chưa check-out.");
        var row = new StaffAttendance { StaffUserId = r.StaffUserId, Note = r.Note, CheckInAt = DateTime.UtcNow, CreatedDate = DateTime.UtcNow }; _db.StaffAttendances.Add(row); await _db.SaveChangesAsync(); return row.Id;
    }
    public async Task CheckOutAsync(int id)
    {
        var row = await _db.StaffAttendances.FindAsync(id) ?? throw new BusinessOperationsException("Không tìm thấy lượt chấm công.");
        if (row.CheckOutAt.HasValue) throw new BusinessOperationsException("Ca đã check-out."); row.CheckOutAt = DateTime.UtcNow; row.UpdatedDate = DateTime.UtcNow; await _db.SaveChangesAsync();
    }

    public async Task<object> GetSummaryAsync(bool includeFinancials) => new
    {
        suppliers = await _db.Suppliers.CountAsync(x => x.Status == 1),
        pendingPurchases = await _db.PurchaseOrders.CountAsync(x => x.PurchaseStatus == "Draft" || x.PurchaseStatus == "Approved" || x.PurchaseStatus == "PartiallyReceived"),
        purchaseValue = includeFinancials ? await _db.PurchaseOrders.Where(x => x.PurchaseStatus != "Cancelled").SumAsync(x => (decimal?)x.TotalAmount) ?? 0 : 0,
        cashIn = includeFinancials ? await _db.CashTransactions.Where(x => x.TransactionType == "Receipt").SumAsync(x => (decimal?)x.Amount) ?? 0 : 0,
        cashOut = includeFinancials ? await _db.CashTransactions.Where(x => x.TransactionType == "Payment").SumAsync(x => (decimal?)x.Amount) ?? 0 : 0,
        openRepairs = await _db.RepairOrders.CountAsync(x => x.RepairStatus != "Delivered" && x.RepairStatus != "Cancelled"),
        openInteractions = await _db.CustomerInteractions.CountAsync(x => x.InteractionStatus == "Open"),
    };

    private Task<bool> HasRoleAsync(int userId, string role) =>
        _db.UserRoles.AnyAsync(x => x.UserId == userId && x.Role.Code == role);
}
