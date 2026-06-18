using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Operations;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Repository;
using MoToSale.Services.Ordering;

namespace MoToSale.Services.Operations;

/// <summary>
/// Hồ sơ tư vấn trả góp (qua đối tác tài chính). Cửa hàng không tự thu góp:
/// duyệt hồ sơ -> tạo đơn bán loại Installment (giữ chỗ tồn, thu trả trước, phần còn lại do đối tác xử lý).
/// </summary>
public class InstallmentService : IInstallmentService
{
    private readonly AppDbContext _db;
    private readonly IOrderService _orders;

    public InstallmentService(AppDbContext db, IOrderService orders)
    {
        _db = db;
        _orders = orders;
    }

    public async Task<int> CreateAsync(CreateInstallmentApplicationRequest r, int? userId)
    {
        if (string.IsNullOrWhiteSpace(r.CustomerName)) throw new InstallmentException("Họ tên là bắt buộc.");
        if (string.IsNullOrWhiteSpace(r.CustomerPhone)) throw new InstallmentException("Số điện thoại là bắt buộc.");
        if (string.IsNullOrWhiteSpace(r.ProductName)) throw new InstallmentException("Sản phẩm quan tâm là bắt buộc.");
        if (r.DownPayment < 0) throw new InstallmentException("Tiền trả trước không hợp lệ.");
        if (r.Months < 0 || r.Months > 60) throw new InstallmentException("Số tháng không hợp lệ.");

        var now = DateTime.UtcNow;
        var app = new InstallmentApplication
        {
            Code = $"TG{now:yyyyMMddHHmmssfff}",
            CustomerId = userId,
            CustomerName = r.CustomerName.Trim(),
            CustomerPhone = r.CustomerPhone.Trim(),
            CustomerEmail = r.CustomerEmail,
            ProductId = r.ProductId,
            SkuId = r.SkuId,
            ProductSnapshot = r.ProductName.Trim(),
            FinancePartner = r.FinancePartner,
            DownPayment = r.DownPayment,
            Months = r.Months,
            Note = r.Note,
            ApplicationStatus = "Pending",
            CreatedDate = now,
        };
        _db.InstallmentApplications.Add(app);
        await _db.SaveChangesAsync();
        return app.Id;
    }

    public async Task<List<InstallmentApplicationDto>> GetAllAsync(string? status)
    {
        var q = _db.InstallmentApplications.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.ApplicationStatus == status);
        var rows = await q.OrderByDescending(x => x.Id).ToListAsync();
        return await BuildDtosAsync(rows);
    }

    // Hồ sơ của chính khách (đăng nhập) để hiển thị trong "Đơn hàng của tôi".
    public async Task<List<InstallmentApplicationDto>> GetMineAsync(int userId)
    {
        var rows = await _db.InstallmentApplications.AsNoTracking()
            .Where(x => x.CustomerId == userId)
            .OrderByDescending(x => x.Id)
            .ToListAsync();
        return await BuildDtosAsync(rows);
    }

    public async Task<InstallmentApplicationDto?> GetByIdAsync(int id, int? userId, bool isStaff)
    {
        var app = await _db.InstallmentApplications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (app is null) return null;
        if (!isStaff && (userId is null || app.CustomerId != userId))
            throw new InstallmentException("Bạn không có quyền xem hồ sơ này.");
        return (await BuildDtosAsync(new List<InstallmentApplication> { app })).FirstOrDefault();
    }

    private async Task<List<InstallmentApplicationDto>> BuildDtosAsync(List<InstallmentApplication> rows)
    {
        var orderIds = rows.Where(x => x.OrderId.HasValue).Select(x => x.OrderId!.Value).Distinct().ToList();
        var orderCodes = orderIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.Orders.AsNoTracking().Where(o => orderIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.Code);

        return rows.Select(x => new InstallmentApplicationDto(
            x.Id, x.Code, x.CustomerId, x.CustomerName, x.CustomerPhone, x.CustomerEmail,
            x.ProductId, x.SkuId, x.ProductSnapshot, x.FinancePartner, x.DownPayment, x.Months,
            x.Note, x.ApplicationStatus, x.OrderId,
            x.OrderId.HasValue ? orderCodes.GetValueOrDefault(x.OrderId.Value) : null,
            x.CreatedDate, x.HandledAt)).ToList();
    }

    public async Task<int> ApproveAsync(int id, ApproveInstallmentApplicationRequest r, int? userId)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InstallmentException("Không tìm thấy hồ sơ trả góp.");
        if (app.ApplicationStatus != "Pending") throw new InstallmentException("Chỉ duyệt được hồ sơ đang chờ xử lý.");
        if (r.SkuId <= 0) throw new InstallmentException("Vui lòng chọn SKU để lập đơn.");
        if (r.Qty <= 0) throw new InstallmentException("Số lượng phải lớn hơn 0.");
        if (r.DownPayment <= 0) throw new InstallmentException("Tiền trả trước phải lớn hơn 0.");

        var partner = string.IsNullOrWhiteSpace(app.FinancePartner) ? r.FinancePartner : app.FinancePartner;
        var partnerLabel = string.IsNullOrWhiteSpace(partner) ? "đối tác tài chính" : partner;
        // Header tự mô tả (đối tác + kỳ hạn + trả trước) để chi tiết đơn & hợp đồng luôn đọc được,
        // kể cả khi hồ sơ gốc không có ghi chú chi tiết.
        var note = $"Trả góp qua {partnerLabel}"
                 + (app.Months > 0 ? $", kỳ hạn {app.Months} tháng" : "")
                 + (string.IsNullOrWhiteSpace(r.Note) ? "" : $" — {r.Note}")
                 + (string.IsNullOrWhiteSpace(app.Note) ? "" : $"\n\n{app.Note}");

        // Lấy email + địa chỉ + hình thức nhận từ hồ sơ để đơn tạo ra không bị trống các cột này.
        var (receivingMethod, shippingAddress) = ResolveDeliveryFromNote(app.Note);

        // Tạo đơn bán loại Installment: giữ chỗ tồn, thu trả trước; phần còn lại do đối tác tài chính xử lý.
        var pos = new PosOrderRequest(
            CustomerId: app.CustomerId,
            CustomerName: app.CustomerName,
            CustomerPhone: app.CustomerPhone,
            Note: note,
            OrderType: OrderType.Installment,
            DepositAmount: r.DownPayment,
            VoucherCode: null,
            PaymentMethod: string.IsNullOrWhiteSpace(r.PaymentMethod) ? PaymentMethod.Cash : r.PaymentMethod,
            PaidAmount: r.DownPayment,
            Lines: new List<PosOrderLineRequest> { new(r.SkuId, r.Qty, r.UnitPrice) },
            CustomerEmail: app.CustomerEmail,
            ShippingAddress: shippingAddress,
            ReceivingMethod: receivingMethod);

        int orderId;
        try
        {
            orderId = await _orders.CreatePosOrderAsync(pos, userId);
        }
        catch (OrderException ex)
        {
            throw new InstallmentException(ex.Message);
        }

        var now = DateTime.UtcNow;
        app.OrderId = orderId;
        app.ApplicationStatus = "Approved";
        app.FinancePartner = partner;
        app.SkuId = r.SkuId;
        app.HandledBy = userId;
        app.HandledAt = now;
        app.UpdatedDate = now;
        await _db.SaveChangesAsync();
        return orderId;
    }

    public async Task RejectAsync(int id, string? note, int? userId)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InstallmentException("Không tìm thấy hồ sơ trả góp.");
        if (app.ApplicationStatus != "Pending") throw new InstallmentException("Chỉ từ chối được hồ sơ đang chờ xử lý.");
        var now = DateTime.UtcNow;
        app.ApplicationStatus = "Rejected";
        app.Note = string.IsNullOrWhiteSpace(note)
            ? app.Note
            : string.IsNullOrWhiteSpace(app.Note)
                ? $"Lý do từ chối: {note.Trim()}"
                : $"{app.Note}\nLý do từ chối: {note.Trim()}";
        app.HandledBy = userId;
        app.HandledAt = now;
        app.UpdatedDate = now;
        await _db.SaveChangesAsync();
    }

    // Khách tự sửa hồ sơ của mình khi còn đang chờ duyệt (note đã dựng lại ở client).
    public async Task UpdateAsync(int id, UpdateInstallmentApplicationRequest r, int? userId)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InstallmentException("Không tìm thấy hồ sơ trả góp.");
        if (userId is null || app.CustomerId != userId)
            throw new InstallmentException("Bạn không có quyền sửa hồ sơ này.");
        if (app.ApplicationStatus != "Pending")
            throw new InstallmentException("Chỉ sửa được hồ sơ đang chờ duyệt.");
        if (string.IsNullOrWhiteSpace(r.CustomerName)) throw new InstallmentException("Họ tên là bắt buộc.");
        if (string.IsNullOrWhiteSpace(r.CustomerPhone)) throw new InstallmentException("Số điện thoại là bắt buộc.");
        if (r.DownPayment < 0) throw new InstallmentException("Tiền trả trước không hợp lệ.");
        if (r.Months < 0 || r.Months > 60) throw new InstallmentException("Số tháng không hợp lệ.");

        app.CustomerName = r.CustomerName.Trim();
        app.CustomerPhone = r.CustomerPhone.Trim();
        app.CustomerEmail = r.CustomerEmail;
        app.FinancePartner = r.FinancePartner;
        app.DownPayment = r.DownPayment;
        app.Months = r.Months;
        app.Note = r.Note;
        app.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Khách tự hủy (rút) hồ sơ khi còn đang chờ duyệt.
    public async Task CancelOwnAsync(int id, int? userId)
    {
        var app = await _db.InstallmentApplications.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InstallmentException("Không tìm thấy hồ sơ trả góp.");
        if (userId is null || app.CustomerId != userId)
            throw new InstallmentException("Bạn không có quyền hủy hồ sơ này.");
        if (app.ApplicationStatus != "Pending")
            throw new InstallmentException("Chỉ hủy được hồ sơ đang chờ duyệt.");
        var now = DateTime.UtcNow;
        app.ApplicationStatus = "Cancelled";
        app.HandledAt = now;
        app.UpdatedDate = now;
        await _db.SaveChangesAsync();
    }

    // Hồ sơ gửi từ web ghi địa chỉ nhận trong note: "Nhận hàng: giao tận nơi — <địa chỉ>" hoặc "Nhận hàng: trực tiếp tại cửa hàng".
    // Trả về (hình thức nhận, địa chỉ giao) để gán vào đơn; fallback địa chỉ thường trú nếu nhận tại cửa hàng.
    private static (string ReceivingMethod, string? ShippingAddress) ResolveDeliveryFromNote(string? note)
    {
        var receiving = PickNoteLine(note, "Nhận hàng:");
        if (!string.IsNullOrWhiteSpace(receiving) && receiving.Contains("giao tận nơi", StringComparison.OrdinalIgnoreCase))
        {
            var dashIndex = receiving.IndexOf('—');
            var address = dashIndex >= 0 ? receiving[(dashIndex + 1)..].Trim() : null;
            return ("Delivery", string.IsNullOrWhiteSpace(address) ? PickNoteLine(note, "Địa chỉ thường trú:") : address);
        }
        return ("Pickup", PickNoteLine(note, "Địa chỉ thường trú:"));
    }

    private static string? PickNoteLine(string? note, string prefix)
    {
        if (string.IsNullOrWhiteSpace(note)) return null;
        foreach (var raw in note.Split('\n'))
        {
            var line = raw.Trim();
            if (line.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var value = line[prefix.Length..].Trim();
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }
        }
        return null;
    }
}
