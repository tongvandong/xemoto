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

public static class BusinessOperationsConfiguration
{
    public static void Configure(ModelBuilder b)
    {
        b.Entity<Supplier>(e =>
        {
            e.ToTable("Suppliers"); e.Property(x => x.Code).HasMaxLength(40).IsRequired(); e.Property(x => x.Name).HasMaxLength(180).IsRequired();
            e.Property(x => x.TaxCode).HasMaxLength(40); e.Property(x => x.ContactName).HasMaxLength(150); e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Email).HasMaxLength(255); e.Property(x => x.Address).HasMaxLength(500); e.Property(x => x.Note).HasMaxLength(1000); e.HasIndex(x => x.Code).IsUnique();
        });
        b.Entity<PurchaseOrder>(e =>
        {
            e.ToTable("PurchaseOrders"); e.Property(x => x.Code).HasMaxLength(40).IsRequired(); e.Property(x => x.PurchaseStatus).HasMaxLength(24).IsUnicode(false).IsRequired();
            e.Property(x => x.TotalAmount).HasPrecision(18, 2); e.Property(x => x.PaidAmount).HasPrecision(18, 2); e.Property(x => x.Note).HasMaxLength(1000);
            e.HasIndex(x => x.Code).IsUnique(); e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Lines).WithOne(x => x.PurchaseOrder).HasForeignKey(x => x.PurchaseOrderId);
            e.ToTable(t => t.HasCheckConstraint("CK_PurchaseOrders_Amounts", "[TotalAmount] >= 0 AND [PaidAmount] >= 0 AND [PaidAmount] <= [TotalAmount]"));
        });
        b.Entity<PurchaseOrderLine>(e =>
        {
            e.ToTable("PurchaseOrderLines"); e.Property(x => x.UnitCost).HasPrecision(18, 2); e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_PurchaseOrderLines_Values", "[OrderedQty] > 0 AND [ReceivedQty] >= 0 AND [ReceivedQty] <= [OrderedQty] AND [UnitCost] >= 0"));
        });
        b.Entity<GoodsReceipt>(e =>
        {
            e.ToTable("GoodsReceipts"); e.Property(x => x.Code).HasMaxLength(40).IsRequired(); e.Property(x => x.Note).HasMaxLength(1000); e.HasIndex(x => x.Code).IsUnique();
            e.HasOne<PurchaseOrder>().WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Lines).WithOne(x => x.GoodsReceipt).HasForeignKey(x => x.GoodsReceiptId);
        });
        b.Entity<GoodsReceiptLine>(e =>
        {
            e.ToTable("GoodsReceiptLines"); e.Property(x => x.UnitCost).HasPrecision(18, 2); e.HasOne<PurchaseOrderLine>().WithMany().HasForeignKey(x => x.PurchaseOrderLineId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict); e.ToTable(t => t.HasCheckConstraint("CK_GoodsReceiptLines_Qty", "[Qty] > 0 AND [UnitCost] >= 0"));
        });
        b.Entity<CashTransaction>(e =>
        {
            e.ToTable("CashTransactions"); e.Property(x => x.Code).HasMaxLength(40).IsRequired(); e.Property(x => x.TransactionType).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.Category).HasMaxLength(60).IsRequired(); e.Property(x => x.Method).HasMaxLength(20).IsUnicode(false); e.Property(x => x.ReferenceType).HasMaxLength(40);
            e.Property(x => x.Note).HasMaxLength(1000); e.Property(x => x.Amount).HasPrecision(18, 2); e.HasIndex(x => x.Code).IsUnique(); e.ToTable(t => t.HasCheckConstraint("CK_CashTransactions_Amount", "[Amount] > 0"));
        });
        b.Entity<RepairOrder>(e =>
        {
            e.ToTable("RepairOrders"); e.Property(x => x.Code).HasMaxLength(40).IsRequired(); e.Property(x => x.VehicleDescription).HasMaxLength(255).IsRequired(); e.Property(x => x.ReportedIssue).HasMaxLength(1000).IsRequired();
            e.Property(x => x.RepairStatus).HasMaxLength(20).IsUnicode(false).IsRequired(); e.Property(x => x.LaborCost).HasPrecision(18, 2); e.Property(x => x.PartsCost).HasPrecision(18, 2); e.Property(x => x.Note).HasMaxLength(1000); e.HasIndex(x => x.Code).IsUnique();
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict); e.HasOne<Warranty>().WithMany().HasForeignKey(x => x.WarrantyId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Lines).WithOne(x => x.RepairOrder).HasForeignKey(x => x.RepairOrderId); e.ToTable(t => t.HasCheckConstraint("CK_RepairOrders_Amounts", "[LaborCost] >= 0 AND [PartsCost] >= 0"));
        });
        b.Entity<RepairOrderLine>(e =>
        {
            e.ToTable("RepairOrderLines"); e.Property(x => x.Description).HasMaxLength(500).IsRequired(); e.Property(x => x.UnitPrice).HasPrecision(18, 2); e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_RepairOrderLines_Values", "[Qty] > 0 AND [UnitPrice] >= 0"));
        });
        b.Entity<RepairStatusHistory>(e =>
        {
            e.ToTable("RepairStatusHistories"); e.Property(x => x.FromStatus).HasMaxLength(20).IsUnicode(false); e.Property(x => x.ToStatus).HasMaxLength(20).IsUnicode(false).IsRequired(); e.Property(x => x.Note).HasMaxLength(1000);
            e.HasOne<RepairOrder>().WithMany().HasForeignKey(x => x.RepairOrderId).OnDelete(DeleteBehavior.Cascade); e.HasIndex(x => new { x.RepairOrderId, x.ChangedAt });
        });
        b.Entity<CustomerInteraction>(e =>
        {
            e.ToTable("CustomerInteractions"); e.Property(x => x.InteractionType).HasMaxLength(20).IsUnicode(false); e.Property(x => x.InteractionStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Subject).HasMaxLength(255).IsRequired(); e.Property(x => x.Note).HasMaxLength(1000); e.HasOne<User>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict); e.HasIndex(x => x.FollowUpAt);
        });
        b.Entity<StaffAttendance>(e =>
        {
            e.ToTable("StaffAttendances"); e.Property(x => x.Note).HasMaxLength(500); e.HasOne<User>().WithMany().HasForeignKey(x => x.StaffUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StaffUserId, x.CheckInAt });
        });
    }
}
