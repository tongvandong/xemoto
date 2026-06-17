using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.Ordering;

namespace MoToSale.Services.Ordering;

public partial class VoucherService : IVoucherService
{
    private const string AmountDiscount = "Amount";
    private const string PercentDiscount = "Percent";

    private readonly IVoucherRepository _vouchers;

    public VoucherService(IVoucherRepository vouchers)
    {
        _vouchers = vouchers;
    }

    public async Task<PagingResponse<VoucherDto>> SearchAsync(PagingRequest request)
    {
        var page = await _vouchers.SearchAsync(request);

        // Lấy phạm vi (scope) của tất cả voucher trong trang bằng 1 truy vấn, rồi gắn vào từng DTO.
        var voucherIds = page.Items.Select(voucher => voucher.Id).ToList();
        var scopeMap = await _vouchers.GetScopeMapAsync(voucherIds);

        return new PagingResponse<VoucherDto>
        {
            Items = page.Items.Select(voucher => Map(voucher, GetScopes(scopeMap, voucher.Id))).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        };
    }

    public async Task<VoucherDto?> GetAsync(int id)
    {
        var voucher = await _vouchers.GetByIdAsync(id);
        if (voucher == null)
        {
            return null;
        }

        var scopeMap = await _vouchers.GetScopeMapAsync(new[] { id });
        return Map(voucher, GetScopes(scopeMap, id));
    }

    private static List<VoucherScopeDto> GetScopes(Dictionary<int, List<VoucherScopeDto>> scopeMap, int voucherId)
    {
        return scopeMap.TryGetValue(voucherId, out var scopes) ? scopes : new List<VoucherScopeDto>();
    }

    public async Task<int> CreateAsync(SaveVoucherRequest request)
    {
        ValidateVoucherRequest(request);

        string code = request.Code.Trim().ToUpperInvariant();
        bool codeAlreadyExists = await _vouchers.CodeExistsAsync(code);
        if (codeAlreadyExists)
        {
            throw new VoucherException("Mã voucher đã tồn tại.");
        }

        string discountType = NormalizeDiscountType(request.DiscountType);
        ValidateDiscountShape(discountType, request.DiscountValue);

        var voucher = CreateVoucherEntity(request, code, discountType);

        _vouchers.Add(voucher);
        await _vouchers.SaveChangesAsync();

        // Lưu phạm vi áp dụng (gắn voucher với sản phẩm/danh mục/hãng) sau khi đã có Id voucher.
        await _vouchers.ReplaceScopesAsync(voucher.Id, request.ScopeType, request.ScopeRefIds);

        return voucher.Id;
    }

    public async Task UpdateAsync(int id, SaveVoucherRequest request)
    {
        ValidateVoucherRequest(request);

        var voucher = await _vouchers.GetByIdAsync(id);
        if (voucher == null)
        {
            throw new VoucherException("Không tìm thấy voucher.");
        }

        string code = request.Code.Trim().ToUpperInvariant();
        bool codeAlreadyExists = await _vouchers.CodeExistsAsync(code, id);
        if (codeAlreadyExists)
        {
            throw new VoucherException("Mã voucher đã tồn tại.");
        }

        string discountType = NormalizeDiscountType(request.DiscountType);
        ValidateDiscountShape(discountType, request.DiscountValue);

        UpdateVoucherEntity(voucher, request, code, discountType);

        _vouchers.Update(voucher);
        await _vouchers.SaveChangesAsync();

        // Ghi đè phạm vi áp dụng theo lựa chọn mới (xoá scope cũ, thêm scope mới).
        await _vouchers.ReplaceScopesAsync(voucher.Id, request.ScopeType, request.ScopeRefIds);
    }

    public async Task DeleteAsync(int id)
    {
        var voucher = await _vouchers.GetByIdAsync(id);
        if (voucher == null)
        {
            throw new VoucherException("Không tìm thấy voucher.");
        }

        if (voucher.UsedCount > 0)
        {
            throw new VoucherException("Voucher đã được sử dụng trong đơn hàng, không thể xóa. Hãy đặt trạng thái ngừng thay vì xóa.");
        }

        _vouchers.Delete(voucher);
        await _vouchers.SaveChangesAsync();
    }

    private static void ValidateVoucherRequest(SaveVoucherRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            throw new VoucherException("Mã voucher là bắt buộc.");
        }
    }

    private static string NormalizeDiscountType(string? value)
    {
        string type = (value ?? string.Empty).Trim();
        if (type.Equals("Amount", StringComparison.OrdinalIgnoreCase))
        {
            return AmountDiscount;
        }

        if (type.Equals("Fixed", StringComparison.OrdinalIgnoreCase))
        {
            return AmountDiscount;
        }

        if (type.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase))
        {
            return AmountDiscount;
        }

        return PercentDiscount;
    }

    private static int NormalizeStatus(int status)
    {
        if (status == (int)EntityStatus.Inactive)
        {
            return (int)EntityStatus.Inactive;
        }

        return (int)EntityStatus.Active;
    }

    private static void ValidateDiscountShape(string discountType, decimal discountValue)
    {
        if (discountValue <= 0)
        {
            throw new VoucherException("Giá trị giảm phải lớn hơn 0.");
        }

        if (discountType == PercentDiscount && discountValue > 100)
        {
            throw new VoucherException("Voucher phần trăm chỉ được giảm từ 1 đến 100%.");
        }
    }

    private static Voucher CreateVoucherEntity(SaveVoucherRequest request, string code, string discountType)
    {
        return new Voucher
        {
            Code = code,
            Description = request.Description,
            DiscountType = discountType,
            DiscountValue = request.DiscountValue,
            MaxDiscount = request.MaxDiscount,
            MinOrderValue = request.MinOrderValue,
            UsageLimit = request.UsageLimit,
            PerUserLimit = request.PerUserLimit,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            CreatedDate = DateTime.UtcNow,
            Status = NormalizeStatus(request.Status),
        };
    }

    private static void UpdateVoucherEntity(Voucher voucher, SaveVoucherRequest request, string code, string discountType)
    {
        voucher.Code = code;
        voucher.Description = request.Description;
        voucher.DiscountType = discountType;
        voucher.DiscountValue = request.DiscountValue;
        voucher.MaxDiscount = request.MaxDiscount;
        voucher.MinOrderValue = request.MinOrderValue;
        voucher.UsageLimit = request.UsageLimit;
        voucher.PerUserLimit = request.PerUserLimit;
        voucher.StartAt = request.StartAt;
        voucher.EndAt = request.EndAt;
        voucher.Status = NormalizeStatus(request.Status);
        voucher.UpdatedDate = DateTime.UtcNow;
    }

    private static VoucherDto Map(Voucher voucher, List<VoucherScopeDto>? scopes = null)
    {
        return new VoucherDto(
            voucher.Id,
            voucher.Code,
            voucher.Description,
            voucher.DiscountType,
            voucher.DiscountValue,
            voucher.MaxDiscount,
            voucher.MinOrderValue,
            voucher.UsageLimit,
            voucher.PerUserLimit,
            voucher.UsedCount,
            voucher.StartAt,
            voucher.EndAt,
            voucher.Status,
            scopes ?? new List<VoucherScopeDto>());
    }
}
