namespace MoToSale.Common.Auth;

/// <summary>Quản lý tập trung các vai trò hệ thống, tránh hardcode chuỗi role nhiều nơi.</summary>
public static class RoleConstant
{
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public const string Customer = "Customer";
}
