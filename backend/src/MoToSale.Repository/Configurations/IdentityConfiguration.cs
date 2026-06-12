using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Entities.Identity;

namespace MoToSale.Repository.Configurations;

public static class IdentityConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.Property(x => x.PhoneNumber).HasMaxLength(20);
            e.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            e.Property(x => x.CareNote).HasMaxLength(1000);
            e.Property(x => x.CreatedDate).HasColumnType("datetime2(0)");
            e.Property(x => x.UpdatedDate).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Role>(e =>
        {
            e.ToTable("Roles");
            e.Property(x => x.Code).HasMaxLength(30).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();

            e.HasData(
                new Role { Id = 1, Code = RoleConstant.Admin, Name = "Quản trị viên", Status = (int)EntityStatus.Active },
                new Role { Id = 2, Code = RoleConstant.Staff, Name = "Nhân viên", Status = (int)EntityStatus.Active },
                new Role { Id = 3, Code = RoleConstant.Customer, Name = "Khách hàng", Status = (int)EntityStatus.Active });
        });

        b.Entity<UserRole>(e =>
        {
            e.ToTable("UserRoles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(user => user.UserRoles).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Role).WithMany(role => role.UserRoles).HasForeignKey(x => x.RoleId);
        });

        b.Entity<Address>(e =>
        {
            e.ToTable("Addresses");
            e.Property(x => x.RecipientName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.Property(x => x.Line).HasMaxLength(255).IsRequired();
            e.Property(x => x.Ward).HasMaxLength(100);
            e.Property(x => x.District).HasMaxLength(100);
            e.Property(x => x.Province).HasMaxLength(100);
            e.HasOne(x => x.User).WithMany(user => user.Addresses).HasForeignKey(x => x.UserId);
        });
    }
}
