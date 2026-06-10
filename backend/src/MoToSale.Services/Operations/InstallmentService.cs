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
/// duyệt hồ sơ -> tạo đơn bán loại Installment (giữ chỗ tồn, thu trả trước, nhận đủ khi giao).
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
        if (r.DownPayment < 0) throw new InstallmentException("Tiền trả trước không hợp lệ.");

        var partner = string.IsNullOrWhiteSpace(r.FinancePartner) ? app.FinancePartner : r.FinancePartner;
        var note = $"Trả góp qua {(string.IsNullOrWhiteSpace(partner) ? "đối tác tài chính" : partner)}"
                 + (string.IsNullOrWhiteSpace(r.Note) ? "" : $" — {r.Note}");

        // Tạo đơn bán loại Installment: giữ chỗ tồn, thu trả trước; phần còn lại do đối tác giải ngân khi giao.
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
            Lines: new List<PosOrderLineRequest> { new(r.SkuId, r.Qty, r.UnitPrice) });

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
        app.Note = string.IsNullOrWhiteSpace(note) ? app.Note : note;
        app.HandledBy = userId;
        app.HandledAt = now;
        app.UpdatedDate = now;
        await _db.SaveChangesAsync();
    }
}
