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

public static class PaymentConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<Payment>(e =>
        {
            e.ToTable("Payments");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.PaymentType).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Method).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.PaymentRecordStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.TransactionRef).HasMaxLength(100);
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.PaidAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.OrderId);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedBy).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0"));
        });
    }
}
