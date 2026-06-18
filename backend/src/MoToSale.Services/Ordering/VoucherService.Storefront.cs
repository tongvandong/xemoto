using MoToSale.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;

namespace MoToSale.Services.Ordering;

// Nhóm nghiệp vụ phía khách hàng (storefront): hiển thị voucher khả dụng và kiểm tra mã khi đặt hàng.
public partial class VoucherService
{
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

        // VND không có đơn vị nhỏ hơn 1 đồng — làm tròn để tổng đơn, tiền cọc và phần còn lại
        // luôn là số nguyên, tránh lệch vài đồng giữa số khách nhập và số cần thanh toán.
        return Math.Round(discount, 0, MidpointRounding.AwayFromZero);
    }
}
