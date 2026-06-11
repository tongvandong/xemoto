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
    private static void ConfigureOrdering(ModelBuilder b)
    {
        b.Entity<Cart>(e =>
        {
            e.ToTable("Carts");
            e.HasIndex(x => x.UserId);
            e.HasMany(x => x.Items).WithOne(i => i.Cart).HasForeignKey(i => i.CartId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<CartItem>(e =>
        {
            e.ToTable("CartItems");
            e.Property(x => x.UnitPriceSnapshot).HasPrecision(18, 2);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_CartItems_Quantities", "[Qty] > 0 AND [UnitPriceSnapshot] >= 0"));
        });

        b.Entity<Order>(e =>
        {
            e.ToTable("Orders");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Channel).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.OrderType).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.OrderStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.PaymentMethod).HasMaxLength(20).IsUnicode(false).HasDefaultValue(PaymentMethod.COD);
            e.Property(x => x.PaymentStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.FulfillmentStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.ReceivingMethod).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.ShippingRecipient).HasMaxLength(150);
            e.Property(x => x.ShippingPhone).HasMaxLength(20);
            e.Property(x => x.ShippingEmail).HasMaxLength(255);
            e.Property(x => x.ShippingAddress).HasMaxLength(500);
            e.Property(x => x.Note).HasMaxLength(1000);
            e.Property(x => x.FulfillmentNote).HasMaxLength(1000);
            e.Property(x => x.PickupAppointmentAt).HasColumnType("datetime2(0)");
            e.Property(x => x.PlacedAt).HasColumnType("datetime2(0)");
            foreach (var p in new[] { nameof(Order.Subtotal), nameof(Order.DiscountTotal), nameof(Order.ShippingFee), nameof(Order.GrandTotal), nameof(Order.DepositAmount), nameof(Order.RemainingAmount) })
                e.Property(p).HasPrecision(18, 2);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.UserId);
            e.HasMany(x => x.Lines).WithOne(l => l.Order).HasForeignKey(l => l.OrderId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Orders_Amounts", "[Subtotal] >= 0 AND [DiscountTotal] >= 0 AND [ShippingFee] >= 0 AND [GrandTotal] >= 0 AND [DepositAmount] >= 0 AND [RemainingAmount] >= 0"));
        });

        b.Entity<OrderLine>(e =>
        {
            e.ToTable("OrderLines");
            e.Property(x => x.ProductNameSnapshot).HasMaxLength(255);
            e.Property(x => x.SkuCodeSnapshot).HasMaxLength(80);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.LineTotal).HasPrecision(18, 2);
            e.HasMany(x => x.Allocations).WithOne(a => a.OrderLine).HasForeignKey(a => a.OrderLineId);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_OrderLines_Quantities", "[Qty] > 0 AND [UnitPrice] >= 0 AND [LineTotal] >= 0"));
        });

        b.Entity<Allocation>(e =>
        {
            e.ToTable("Allocations");
            e.Property(x => x.AllocationStatus).HasMaxLength(20).IsUnicode(false);
            e.ToTable(t => t.HasCheckConstraint("CK_Allocations_Qty", "[Qty] > 0"));
        });

        b.Entity<OrderStatusHistory>(e =>
        {
            e.ToTable("OrderStatusHistories");
            e.Property(x => x.FromStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.ToStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasIndex(x => x.OrderId);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ChangedBy).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Voucher>(e =>
        {
            e.ToTable("Vouchers");
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Description).HasMaxLength(255);
            e.Property(x => x.DiscountType).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.DiscountValue).HasPrecision(18, 2);
            e.Property(x => x.MaxDiscount).HasPrecision(18, 2);
            e.Property(x => x.MinOrderValue).HasPrecision(18, 2);
            e.Property(x => x.StartAt).HasColumnType("datetime2(0)");
            e.Property(x => x.EndAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Code).IsUnique();
            e.ToTable(t => t.HasCheckConstraint("CK_Vouchers_Values", "[DiscountValue] > 0 AND [MinOrderValue] >= 0 AND ([MaxDiscount] IS NULL OR [MaxDiscount] >= 0) AND ([UsageLimit] IS NULL OR [UsageLimit] > 0) AND ([PerUserLimit] IS NULL OR [PerUserLimit] > 0) AND [UsedCount] >= 0 AND ([StartAt] IS NULL OR [EndAt] IS NULL OR [StartAt] <= [EndAt])"));
        });

        b.Entity<VoucherScope>(e =>
        {
            e.ToTable("VoucherScopes");
            e.Property(x => x.ScopeType).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.HasOne(x => x.Voucher).WithMany().HasForeignKey(x => x.VoucherId);
            e.HasIndex(x => new { x.VoucherId, x.ScopeType, x.RefId }).IsUnique();
        });

        b.Entity<VoucherRedemption>(e =>
        {
            e.ToTable("VoucherRedemptions");
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.RedeemedAt).HasColumnType("datetime2(0)");
            e.HasOne(x => x.Voucher).WithMany().HasForeignKey(x => x.VoucherId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.VoucherId, x.OrderId }).IsUnique();
            e.ToTable(t => t.HasCheckConstraint("CK_VoucherRedemptions_Amount", "[Amount] >= 0"));
        });

        b.Entity<OrderVoucher>(e =>
        {
            e.ToTable("OrderVouchers");
            e.Property(x => x.VoucherCodeSnapshot).HasMaxLength(40).IsRequired();
            e.Property(x => x.DiscountAmount).HasPrecision(18, 2);
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.OrderId).IsUnique();
            e.ToTable(t => t.HasCheckConstraint("CK_OrderVouchers_DiscountAmount", "[DiscountAmount] >= 0"));
        });
    }
}
