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
public partial class AppDbContext : DbContext
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

}
