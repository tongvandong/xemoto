using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Audit;
using MoToSale.Entities.Identity;

namespace MoToSale.Repository.Configurations;

public static class AuditConfiguration
{
    public static void Configure(ModelBuilder b)
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
}
