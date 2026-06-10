using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Common.Helpers;
using MoToSale.Entities.Identity;

namespace MoToSale.Repository.Seeds;

/// <summary>Seed tai khoan demo de test phan quyen, cham soc khach hang va dia chi giao nhan.</summary>
public static class UserSeedConfiguration
{
    public static async Task RunAsync(AppDbContext db, IPasswordHasher hasher)
    {
        var now = DateTime.UtcNow;
        var roleIds = await db.Roles.ToDictionaryAsync(x => x.Code, x => x.Id);
        var seeds = BuildSeeds();
        var emails = seeds.Select(x => x.Email).ToList();
        var existingUsers = await db.Users
            .Include(x => x.Addresses)
            .Include(x => x.UserRoles)
            .Where(x => emails.Contains(x.Email))
            .ToDictionaryAsync(x => x.Email);

        foreach (var seed in seeds)
        {
            var roleId = roleIds[seed.RoleCode];
            if (!existingUsers.TryGetValue(seed.Email, out var user))
            {
                user = new User
                {
                    FullName = seed.FullName,
                    Email = seed.Email,
                    PhoneNumber = seed.PhoneNumber,
                    PasswordHash = hasher.Hash(seed.Password),
                    CareNote = seed.CareNote,
                    Status = seed.Status,
                    CreatedDate = now,
                    UserRoles = { new UserRole { RoleId = roleId } },
                };
                db.Users.Add(user);
            }
            else if (string.IsNullOrWhiteSpace(user.CareNote) && !string.IsNullOrWhiteSpace(seed.CareNote))
            {
                user.CareNote = seed.CareNote;
                user.UpdatedDate = now;
            }

            if (user.UserRoles.All(x => x.RoleId != roleId))
            {
                user.UserRoles.Add(new UserRole { RoleId = roleId });
            }

            foreach (var address in seed.Addresses)
            {
                if (user.Addresses.Any(x => x.Line == address.Line && x.Province == address.Province)) continue;
                user.Addresses.Add(new Address
                {
                    RecipientName = seed.FullName,
                    Phone = seed.PhoneNumber,
                    Line = address.Line,
                    Ward = address.Ward,
                    District = address.District,
                    Province = address.Province,
                    IsDefault = address.IsDefault,
                    CreatedDate = now,
                });
            }
        }

        await db.SaveChangesAsync();
    }

    private static List<UserSeed> BuildSeeds() =>
    [
        new("Quản trị viên", "admin@motosale.local", "0900000001", "Admin@123", RoleConstant.Admin,
            "Tài khoản quản trị duy nhất dùng để cấu hình hệ thống.", (int)EntityStatus.Active),
        new("Nhân viên vận hành", "staff@motosale.local", "0900000002", "Staff@123", RoleConstant.Staff,
            "Tài khoản staff chung dùng để kiểm tra nghiệp vụ vận hành.", (int)EntityStatus.Active),
        Customer("Khách hàng mẫu", "customer@motosale.local", "0900000003", "Khách hàng demo mặc định.",
            Address("120 Nguyễn Trãi", "Phường Bến Thành", "Quận 1", "TP.HCM", true)),
        Customer("Nguyễn Minh Anh", "minhanh@example.com", "0909123456", "Quan tâm xe tay ga đi làm trong thành phố.",
            Address("32 Lê Văn Sỹ", "Phường 13", "Quận 3", "TP.HCM", true)),
        Customer("Trần Quốc Huy", "quochuy@example.com", "0912233445", "Đã đăng ký tư vấn và lái thử Winner X.",
            Address("18 Phan Xích Long", "Phường 2", "Quận Phú Nhuận", "TP.HCM", true)),
        Customer("Lê Hoàng Nam", "hoangnam@example.com", "0988111222", "Khách mua xe Air Blade, ưu tiên liên hệ qua điện thoại.",
            Address("46 Nguyễn Văn Linh", "Phường Nam Dương", "Quận Hải Châu", "Đà Nẵng", true)),
        Customer("Phạm Thu Trang", "thutrang@example.com", "0934555666", "Khách mua xe số và phụ tùng bảo dưỡng định kỳ.",
            Address("75 Cầu Giấy", "Phường Dịch Vọng", "Quận Cầu Giấy", "Hà Nội", true)),
        Customer("Đỗ Gia Bảo", "giabao@example.com", "0977444555", "Quan tâm trả góp xe tay ga.",
            Address("25 Võ Thị Sáu", "Phường Thống Nhất", "TP. Biên Hòa", "Đồng Nai", true)),
        Customer("Vũ Ngọc Lan", "ngoclan@example.com", "0966333444", "Thường mua phụ kiện và đồ bảo hộ.",
            Address("91 Trần Phú", "Phường Văn Quán", "Quận Hà Đông", "Hà Nội", true)),
        Customer("Bùi Thành Công", "thanhcong@example.com", "0955222333", "Tài khoản khóa mẫu để kiểm tra bộ lọc trạng thái.",
            Address("14 Hai Bà Trưng", "Phường Tân An", "Quận Ninh Kiều", "Cần Thơ", true),
            status: (int)EntityStatus.Inactive),
    ];

    private static UserSeed Customer(string fullName, string email, string phone, string careNote, AddressSeed address, int status = (int)EntityStatus.Active) =>
        new(fullName, email, phone, "Customer@123", RoleConstant.Customer, careNote, status, [address]);

    private static AddressSeed Address(string line, string ward, string district, string province, bool isDefault) =>
        new(line, ward, district, province, isDefault);

    private sealed record UserSeed(
        string FullName,
        string Email,
        string PhoneNumber,
        string Password,
        string RoleCode,
        string? CareNote,
        int Status,
        IReadOnlyCollection<AddressSeed>? SeedAddresses = null)
    {
        public IReadOnlyCollection<AddressSeed> Addresses => SeedAddresses ?? [];
    }

    private sealed record AddressSeed(string Line, string Ward, string District, string Province, bool IsDefault);
}
