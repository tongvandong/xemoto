using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.Ordering;

namespace MoToSale.Services.Ordering;

public class VoucherService : IVoucherService
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

        return new PagingResponse<VoucherDto>
        {
            Items = page.Items.Select(Map).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalItems = page.TotalItems,
        };
    }

    public async Task<List<VoucherDto>> GetAvailableAsync()
    {
        DateTime now = DateTime.UtcNow;
        var allVouchers = await _vouchers.GetAllAsync();

        return allVouchers
            .Where(voucher => VoucherCanBeShownToCustomer(voucher, now))
            .OrderBy(voucher => voucher.MinOrderValue)
            .ThenByDescending(voucher => voucher.DiscountType == AmountDiscount ? voucher.DiscountValue : 0)
            .ThenByDescending(voucher => voucher.DiscountType == PercentDiscount ? voucher.DiscountValue : 0)
            .Select(Map)
            .ToList();
    }

    public async Task<VoucherDto?> GetAsync(int id)
    {
        var voucher = await _vouchers.GetByIdAsync(id);
        if (voucher == null)
        {
            return null;
        }

        return Map(voucher);
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

    public async Task<VoucherValidationResult> ValidateAsync(string code, decimal subtotal)
    {
        string normalizedCode = code.Trim().ToUpperInvariant();
        var voucher = await _vouchers.GetByCodeAsync(normalizedCode);
        if (voucher == null)
        {
            return new VoucherValidationResult(false, "Mã không tồn tại.", 0, null);
        }

        var invalidReason = GetVoucherInvalidReason(voucher, subtotal, DateTime.UtcNow);
        if (invalidReason != null)
        {
            return new VoucherValidationResult(false, invalidReason, 0, null);
        }

        decimal discount = CalculateDiscount(voucher, subtotal);
        return new VoucherValidationResult(true, null, decimal.Round(discount, 2), Map(voucher));
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

    private static bool VoucherCanBeShownToCustomer(Voucher voucher, DateTime now)
    {
        if (voucher.Status != (int)EntityStatus.Active)
        {
            return false;
        }

        if (voucher.DiscountType == PercentDiscount && voucher.DiscountValue > 100)
        {
            return false;
        }

        if (voucher.StartAt.HasValue && voucher.StartAt > now)
        {
            return false;
        }

        if (voucher.EndAt.HasValue && voucher.EndAt < now)
        {
            return false;
        }

        if (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit.Value)
        {
            return false;
        }

        return true;
    }

    private static string? GetVoucherInvalidReason(Voucher voucher, decimal subtotal, DateTime now)
    {
        if (voucher.Status != (int)EntityStatus.Active)
        {
            return "Voucher ngừng hoạt động.";
        }

        if (voucher.DiscountType == PercentDiscount && voucher.DiscountValue > 100)
        {
            return "Voucher không hợp lệ.";
        }

        if (voucher.StartAt.HasValue && now < voucher.StartAt)
        {
            return "Voucher chưa bắt đầu.";
        }

        if (voucher.EndAt.HasValue && now > voucher.EndAt)
        {
            return "Voucher đã hết hạn.";
        }

        if (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit)
        {
            return "Voucher đã hết lượt.";
        }

        if (subtotal < voucher.MinOrderValue)
        {
            return $"Đơn tối thiểu {voucher.MinOrderValue:n0}đ.";
        }

        return null;
    }

    private static decimal CalculateDiscount(Voucher voucher, decimal subtotal)
    {
        decimal discount;
        if (voucher.DiscountType == AmountDiscount)
        {
            discount = voucher.DiscountValue;
        }
        else
        {
            discount = subtotal * voucher.DiscountValue / 100m;
        }

        if (voucher.MaxDiscount.HasValue && discount > voucher.MaxDiscount)
        {
            discount = voucher.MaxDiscount.Value;
        }

        if (discount > subtotal)
        {
            discount = subtotal;
        }

        return discount;
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

    private static VoucherDto Map(Voucher voucher)
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
            voucher.Status);
    }
}
