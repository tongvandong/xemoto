using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Audit;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Content;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Payments;
using MoToSale.Repository.Configurations;

namespace MoToSale.Repository;

/// <summary>DbContext dùng chung cho toàn hệ thống (1 DB — theo khuôn BaseCore).</summary>
public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public override int SaveChanges()
    {
        return SaveChanges(acceptAllChangesOnSuccess: true);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepareSaveChanges();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return SaveChangesAsync(acceptAllChangesOnSuccess: true, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        PrepareSaveChanges();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
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

    private void PrepareSaveChanges()
    {
        EnsureAppendOnlyStockLedger();
        CaptureAuditLogs();
    }

    private void EnsureAppendOnlyStockLedger()
    {
        if (ChangeTracker.Entries<StockMovement>().Any(x => x.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Sổ kho chỉ được ghi thêm, không được sửa hoặc xóa dòng đã phát sinh.");
        }
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        IdentityConfiguration.Configure(b);
        CatalogConfiguration.Configure(b);
        InventoryConfiguration.Configure(b);
        OrderingConfiguration.Configure(b);
        PaymentConfiguration.Configure(b);
        ContentConfiguration.Configure(b);
        ReviewWarrantyConfiguration.Configure(b);
        AdvancedOperationsConfiguration.Configure(b);
        BusinessOperationsConfiguration.Configure(b);
        SystemConfiguration.Configure(b);
        AuditConfiguration.Configure(b);
    }
}
