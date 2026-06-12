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

public static class InventoryConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<InventoryItem>(e =>
        {
            e.ToTable("InventoryItems");
            e.Ignore(x => x.Available);
            e.HasIndex(x => x.SkuId).IsUnique();
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_InventoryItems_Quantities", "[OnHand] >= 0 AND [Reserved] >= 0 AND [Reserved] <= [OnHand] AND [ReorderPoint] >= 0"));
        });

        b.Entity<StockMovement>(e =>
        {
            e.ToTable("StockMovements");
            e.Property(x => x.RefType).HasMaxLength(40);
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.OccurredAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => new { x.SkuId, x.OccurredAt });
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.PerformedBy).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_StockMovements_Quantities", "[QtyDelta] <> 0 AND [BalanceAfter] >= 0"));
        });

        b.Entity<StockDocument>(e =>
        {
            e.ToTable("StockDocuments");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.DocStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.Note).HasMaxLength(1000);
            e.Property(x => x.ApprovedAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasMany(x => x.Lines).WithOne(l => l.StockDocument).HasForeignKey(l => l.StockDocumentId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ApprovedBy).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<StockDocumentLine>(e =>
        {
            e.ToTable("StockDocumentLines");
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_StockDocumentLines_Qty", "[Qty] > 0"));
        });

        b.Entity<Reservation>(e =>
        {
            e.ToTable("Reservations");
            e.Property(x => x.ReservationStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.ExpiresAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => new { x.SkuId, x.ReservationStatus });
            e.HasIndex(x => x.OrderId);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<OrderLine>().WithMany().HasForeignKey(x => x.OrderLineId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Reservations_Qty", "[Qty] > 0"));
        });
    }
}
