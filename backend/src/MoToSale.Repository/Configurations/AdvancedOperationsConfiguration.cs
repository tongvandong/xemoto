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

public static class AdvancedOperationsConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<SalesReturn>(e =>
        {
            e.ToTable("SalesReturns");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.ReturnStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.Reason).HasMaxLength(500).IsRequired();
            e.Property(x => x.Note).HasMaxLength(1000);
            e.Property(x => x.RefundAmount).HasPrecision(18, 2);
            e.Property(x => x.ApprovedAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.OrderId);
            e.HasMany(x => x.Lines).WithOne(x => x.SalesReturn).HasForeignKey(x => x.SalesReturnId);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ApprovedBy).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_SalesReturns_RefundAmount", "[RefundAmount] >= 0"));
        });

        b.Entity<SalesReturnLine>(e =>
        {
            e.ToTable("SalesReturnLines");
            e.Property(x => x.ItemCondition).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.HasOne<OrderLine>().WithMany().HasForeignKey(x => x.OrderLineId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_SalesReturnLines_Values", "[Qty] > 0 AND [UnitPrice] >= 0 AND [LineTotal] >= 0"));
        });

        b.Entity<Refund>(e =>
        {
            e.ToTable("Refunds");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.Method).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.RefundStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.TransactionRef).HasMaxLength(100);
            e.Property(x => x.RefundedAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.OrderId);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<SalesReturn>().WithMany().HasForeignKey(x => x.SalesReturnId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedBy).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Refunds_Amount", "[Amount] > 0"));
        });
    }
}
