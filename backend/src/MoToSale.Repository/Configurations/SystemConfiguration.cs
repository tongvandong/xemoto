using Microsoft.EntityFrameworkCore;

namespace MoToSale.Repository.Configurations;

public static class SystemConfiguration
{
    public static void Configure(ModelBuilder b)
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
