using System.Text.RegularExpressions;

namespace MoToSale.Common;

/// <summary>
/// Quy tắc kiểm tra số điện thoại Việt Nam, dùng chung cho mọi điểm nhập
/// (đăng ký, cập nhật hồ sơ, admin tạo/sửa khách, đặt hàng...).
/// Hợp lệ: bắt đầu bằng số 0, theo sau là 9 hoặc 10 chữ số (tổng 10–11 số).
/// Hỗ trợ người dùng gõ tiền tố +84 (sẽ tự quy về số 0).
/// </summary>
public static class PhoneNumberRule
{
    // ^0  : bắt đầu bằng 0
    // \d{9,10}$ : tiếp theo là 9 đến 10 chữ số
    private static readonly Regex Pattern = new(@"^0\d{9,10}$", RegexOptions.Compiled);

    /// <summary>
    /// Làm sạch chuỗi nhập: bỏ khoảng trắng và các ký tự ngăn cách (. - ( )),
    /// đổi tiền tố quốc tế +84 về 0 để so khớp cho thống nhất.
    /// </summary>
    public static string Normalize(string? phone)
    {
        string digits = Regex.Replace(phone ?? string.Empty, @"[\s.\-()]", string.Empty);

        if (digits.StartsWith("+84"))
        {
            digits = "0" + digits.Substring(3);
        }

        return digits;
    }

    /// <summary>Trả về true nếu số điện thoại đúng định dạng Việt Nam.</summary>
    public static bool IsValid(string? phone)
    {
        return Pattern.IsMatch(Normalize(phone));
    }
}
