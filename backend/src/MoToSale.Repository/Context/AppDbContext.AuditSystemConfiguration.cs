using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Entities.Audit;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Content;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;

namespace MoToSale.Repository;

public partial class AppDbContext
{
    private static void ConfigureAudit(ModelBuilder b)
    {
        b.Entity<AuditLog>(e =>
        {
            e.ToTable("AuditLogs");
            e.Property(x => x.Entity).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityId).HasMaxLength(100).IsRequired();
            e.Property(x => x.Action).HasMaxLength(50).IsRequired();
            e.Property(x => x.ActorName).HasMaxLength(150);
            e.Property(x => x.At).HasColumnType("datetime2(0)");
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.Entity, x.EntityId, x.At });
            e.HasIndex(x => x.ActorId);
        });
    }

    private static void ConfigureSystem(ModelBuilder b)
    {
        b.Entity<MoToSale.Entities.SystemConfig.Setting>(e =>
        {
            e.ToTable("Settings");
            e.Property(x => x.Key).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.Key).IsUnique();
        });
    }
}
