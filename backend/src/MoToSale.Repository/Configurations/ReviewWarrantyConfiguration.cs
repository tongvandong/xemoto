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

namespace MoToSale.Repository.Configurations;

public static class ReviewWarrantyConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<Review>(e =>
        {
            e.ToTable("Reviews");
            e.Property(x => x.Title).HasMaxLength(255);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.ReviewStatus).HasMaxLength(20).IsUnicode(false);
            e.HasIndex(x => new { x.ProductId, x.ReviewStatus });
            e.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Reviews_Rating", "[Rating] >= 1 AND [Rating] <= 5"));
        });

        b.Entity<Warranty>(e =>
        {
            e.ToTable("Warranties");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.ProductSnapshot).HasMaxLength(255);
            e.Property(x => x.SerialNumber).HasMaxLength(100);
            e.Property(x => x.WarrantyStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.CustomerName).HasMaxLength(150);
            e.Property(x => x.CustomerPhone).HasMaxLength(20);
            e.Property(x => x.FrameNumber).HasMaxLength(100);
            e.Property(x => x.EngineNumber).HasMaxLength(100);
            e.Property(x => x.ReportedIssue).HasMaxLength(1000);
            e.Property(x => x.EstimatedCost).HasPrecision(18, 2);
            e.Property(x => x.ActualCost).HasPrecision(18, 2);
            e.Property(x => x.ReceivedAt).HasColumnType("datetime2(0)");
            e.Property(x => x.CompletedAt).HasColumnType("datetime2(0)");
            e.Property(x => x.StartAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<OrderLine>().WithMany().HasForeignKey(x => x.OrderLineId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Warranties_Months", "[Months] > 0"));
        });

        b.Entity<WarrantyHistory>(e =>
        {
            e.ToTable("WarrantyHistories");
            e.Property(x => x.FromStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.ToStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.Note).HasMaxLength(1000);
            e.Property(x => x.ActualCost).HasPrecision(18, 2);
            e.HasIndex(x => x.WarrantyId);
            e.HasOne<Warranty>().WithMany().HasForeignKey(x => x.WarrantyId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ChangedBy).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
