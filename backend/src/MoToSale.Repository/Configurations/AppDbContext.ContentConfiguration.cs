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
}
