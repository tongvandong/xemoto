using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Entities.Audit;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Content;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Payments;
using System.Text.Json;

namespace MoToSale.Repository;

/// <summary>DbContext dùng chung cho toàn hệ thống (1 DB — theo khuôn BaseCore).</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnsureAppendOnlyStockLedger();
        CaptureAuditLogs();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnsureAppendOnlyStockLedger();
        CaptureAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Address> Addresses => Set<Address>();

    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<VehicleModel> VehicleModels => Set<VehicleModel>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Sku> Skus => Set<Sku>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductRelatedItem> ProductRelatedItems => Set<ProductRelatedItem>();
    public DbSet<PartCompatibility> PartCompatibilities => Set<PartCompatibility>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockDocument> StockDocuments => Set<StockDocument>();
    public DbSet<StockDocumentLine> StockDocumentLines => Set<StockDocumentLine>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<Allocation> Allocations => Set<Allocation>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherScope> VoucherScopes => Set<VoucherScope>();
    public DbSet<VoucherRedemption> VoucherRedemptions => Set<VoucherRedemption>();
    public DbSet<OrderVoucher> OrderVouchers => Set<OrderVoucher>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<ContactRequest> ContactRequests => Set<ContactRequest>();
    public DbSet<HomeBanner> HomeBanners => Set<HomeBanner>();

    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Warranty> Warranties => Set<Warranty>();
    public DbSet<WarrantyHistory> WarrantyHistories => Set<WarrantyHistory>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnLine> SalesReturnLines => Set<SalesReturnLine>();
    public DbSet<Refund> Refunds => Set<Refund>();
    public DbSet<InstallmentApplication> InstallmentApplications => Set<InstallmentApplication>();
    public DbSet<StaffShift> StaffShifts => Set<StaffShift>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<GoodsReceipt> GoodsReceipts => Set<GoodsReceipt>();
    public DbSet<GoodsReceiptLine> GoodsReceiptLines => Set<GoodsReceiptLine>();
    public DbSet<CashTransaction> CashTransactions => Set<CashTransaction>();
    public DbSet<RepairOrder> RepairOrders => Set<RepairOrder>();
    public DbSet<RepairOrderLine> RepairOrderLines => Set<RepairOrderLine>();
    public DbSet<RepairStatusHistory> RepairStatusHistories => Set<RepairStatusHistory>();
    public DbSet<CustomerInteraction> CustomerInteractions => Set<CustomerInteraction>();
    public DbSet<StaffAttendance> StaffAttendances => Set<StaffAttendance>();

    public DbSet<MoToSale.Entities.SystemConfig.Setting> Settings => Set<MoToSale.Entities.SystemConfig.Setting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    private void EnsureAppendOnlyStockLedger()
    {
        if (ChangeTracker.Entries<StockMovement>().Any(x => x.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Stock movements are append-only and cannot be updated or deleted.");
        }
    }

    private void CaptureAuditLogs()
    {
        var now = DateTime.UtcNow;
        var entries = ChangeTracker.Entries<BaseEntity>()
            .Where(x => x.Entity is not AuditLog && x.State is (EntityState.Added or EntityState.Modified or EntityState.Deleted))
            .ToList();

        foreach (var entry in entries)
        {
            var oldValues = entry.State == EntityState.Added
                ? null
                : entry.Properties.ToDictionary(x => x.Metadata.Name, x => x.OriginalValue);
            var newValues = entry.State == EntityState.Deleted
                ? null
                : entry.Properties.ToDictionary(x => x.Metadata.Name, x => x.CurrentValue);
            AuditLogs.Add(new AuditLog
            {
                Entity = entry.Metadata.ClrType.Name,
                EntityId = entry.Entity.Id.ToString(),
                Action = entry.State.ToString(),
                OldValueJson = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
                NewValueJson = newValues is null ? null : JsonSerializer.Serialize(newValues),
                At = now,
                CreatedDate = now,
            });
        }
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        ConfigureCatalog(b);
        ConfigureInventory(b);
        ConfigureOrdering(b);
        ConfigurePayments(b);
        ConfigureContent(b);
        ConfigureReviewWarranty(b);
        ConfigureAdvancedOperations(b);
        ConfigureBusinessOperations(b);
        ConfigureSystem(b);
        ConfigureAudit(b);

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
            e.HasOne(x => x.User).WithMany(u => u.UserRoles).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Role).WithMany(r => r.UserRoles).HasForeignKey(x => x.RoleId);
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
            e.HasOne(x => x.User).WithMany(u => u.Addresses).HasForeignKey(x => x.UserId);
        });
    }

    private static void ConfigureCatalog(ModelBuilder b)
    {
        b.Entity<Brand>(e =>
        {
            e.ToTable("Brands");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(150).IsRequired();
            e.Property(x => x.LogoUrl).HasMaxLength(500);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        b.Entity<Manufacturer>(e =>
        {
            e.ToTable("Manufacturers");
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.LogoUrl).HasMaxLength(500);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.Name).IsUnique();
        });

        b.Entity<VehicleModel>(e =>
        {
            e.ToTable("VehicleModels");
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(160).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Brand).WithMany(br => br.VehicleModels).HasForeignKey(x => x.BrandId);
        });

        b.Entity<Category>(e =>
        {
            e.ToTable("Categories");
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(180).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Parent).WithMany(c => c.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Product>(e =>
        {
            e.ToTable("Products");
            e.Property(x => x.Code).HasMaxLength(50).IsRequired();
            e.Property(x => x.Name).HasMaxLength(255).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(280).IsRequired();
            e.Property(x => x.ShortDescription).HasMaxLength(500);
            e.HasOne<Manufacturer>().WithMany().HasForeignKey(x => x.ManufacturerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Brand).WithMany().HasForeignKey(x => x.BrandId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.VehicleModel).WithMany().HasForeignKey(x => x.VehicleModelId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Sku>(e =>
        {
            e.ToTable("Skus");
            e.Property(x => x.SkuCode).HasMaxLength(80).IsRequired();
            e.Property(x => x.VariantName).HasMaxLength(180);
            e.Property(x => x.Color).HasMaxLength(80);
            e.Property(x => x.Version).HasMaxLength(100);
            e.Property(x => x.Barcode).HasMaxLength(80);
            e.Property(x => x.ListPrice).HasPrecision(18, 2);
            e.Property(x => x.SalePrice).HasPrecision(18, 2);
            e.HasIndex(x => x.SkuCode).IsUnique();
            e.HasOne(x => x.Product).WithMany(p => p.Skus).HasForeignKey(x => x.ProductId);
            e.ToTable(t => t.HasCheckConstraint("CK_Skus_Prices", "[ListPrice] >= 0 AND ([SalePrice] IS NULL OR ([SalePrice] >= 0 AND [SalePrice] <= [ListPrice]))"));
        });

        b.Entity<ProductImage>(e =>
        {
            e.ToTable("ProductImages");
            e.Property(x => x.Url).HasMaxLength(500).IsRequired();
            e.Property(x => x.Alt).HasMaxLength(255);
            e.HasOne(x => x.Product).WithMany(p => p.Images).HasForeignKey(x => x.ProductId);
            e.HasOne<Sku>().WithMany().HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ProductId, x.SortOrder });
            e.HasIndex(x => new { x.ProductId, x.SkuId }).IsUnique().HasFilter("[IsPrimary] = 1");
        });

        b.Entity<ProductRelatedItem>(e =>
        {
            e.ToTable("ProductRelatedItems");
            e.Property(x => x.RelationType).HasMaxLength(30).IsRequired();
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasIndex(x => new { x.ProductId, x.RelatedProductId, x.RelationType }).IsUnique();
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RelatedProduct).WithMany().HasForeignKey(x => x.RelatedProductId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<PartCompatibility>(e =>
        {
            e.ToTable("PartCompatibilities");
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.PartProduct).WithMany().HasForeignKey(x => x.PartProductId);
            e.HasOne<Brand>().WithMany().HasForeignKey(x => x.BrandId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<VehicleModel>().WithMany().HasForeignKey(x => x.VehicleModelId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_PartCompatibilities_Years", "[YearFrom] IS NULL OR [YearTo] IS NULL OR [YearFrom] <= [YearTo]"));
        });

    }

    private static void ConfigureInventory(ModelBuilder b)
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

    private static void ConfigurePayments(ModelBuilder b)
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

    private static void ConfigureContent(ModelBuilder b)
    {
        b.Entity<Post>(e =>
        {
            e.ToTable("Posts");
            e.Property(x => x.Title).HasMaxLength(255).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(280).IsRequired();
            e.Property(x => x.Summary).HasMaxLength(500);
            e.Property(x => x.CoverUrl).HasMaxLength(500);
            e.Property(x => x.Category).HasMaxLength(100);
            e.Property(x => x.PostStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.PublishedAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne<User>().WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Faq>(e =>
        {
            e.ToTable("Faqs");
            e.Property(x => x.Question).HasMaxLength(500).IsRequired();
            e.Property(x => x.Category).HasMaxLength(100);
        });

        b.Entity<ContactRequest>(e =>
        {
            e.ToTable("ContactRequests");
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(20).IsRequired();
            e.Property(x => x.Email).HasMaxLength(255);
            e.Property(x => x.Subject).HasMaxLength(255);
            e.Property(x => x.Type).HasMaxLength(30).IsUnicode(false);
            e.Property(x => x.ContactStatus).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.HandledAt).HasColumnType("datetime2(0)");
            e.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<HomeBanner>(e =>
        {
            e.ToTable("HomeBanners");
            e.Property(x => x.Position).HasMaxLength(30).IsUnicode(false);
            e.Property(x => x.Title).HasMaxLength(255);
            e.Property(x => x.ImageUrl).HasMaxLength(500).IsRequired();
            e.Property(x => x.Link).HasMaxLength(500);
        });
    }

    private static void ConfigureReviewWarranty(ModelBuilder b)
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

    private static void ConfigureAdvancedOperations(ModelBuilder b)
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

        b.Entity<StaffShift>(e =>
        {
            e.ToTable("StaffShifts");
            e.Property(x => x.ShiftStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.StartsAt).HasColumnType("datetime2(0)");
            e.Property(x => x.EndsAt).HasColumnType("datetime2(0)");
            e.HasIndex(x => new { x.StaffUserId, x.StartsAt });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.StaffUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.AssignedBy).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_StaffShifts_Time", "[StartsAt] < [EndsAt]"));
        });
    }

    private static void ConfigureBusinessOperations(ModelBuilder b)
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
