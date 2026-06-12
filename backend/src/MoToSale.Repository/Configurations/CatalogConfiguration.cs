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

public static class CatalogConfiguration
{
    public static void Configure(ModelBuilder b)
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
}
