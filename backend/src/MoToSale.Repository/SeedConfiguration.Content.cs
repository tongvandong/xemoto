using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Content;

namespace MoToSale.Repository;

// Seed nội dung: bài viết, FAQ, yêu cầu liên hệ, banner trang chủ.
public static partial class SeedConfiguration
{
    private static async Task AddMissingContentAsync(AppDbContext db, DateTime now)
    {
        var postSlugs = await db.Posts.Select(x => x.Slug).ToListAsync();
        var authorId = await db.Users.Where(x => x.Email == "admin@motosale.local").Select(x => (int?)x.Id).FirstOrDefaultAsync();
        var posts = new[]
        {
            new Post { Title = "Kinh nghiệm chọn xe máy đi làm hằng ngày", Slug = "kinh-nghiem-chon-xe-may-di-lam", Summary = "Các tiêu chí cần cân nhắc khi chọn xe đi làm.", Body = "Ưu tiên mức tiêu hao nhiên liệu, tư thế lái, chi phí bảo dưỡng và nhu cầu di chuyển thực tế.", Category = "Tư vấn mua xe", PostStatus = "Published", PublishedAt = now.AddDays(-12), AuthorId = authorId, CreatedDate = now },
            new Post { Title = "Khi nào nên thay dầu nhớt xe máy?", Slug = "khi-nao-nen-thay-dau-nhot-xe-may", Summary = "Lịch thay nhớt giúp xe vận hành ổn định.", Body = "Kiểm tra hướng dẫn của nhà sản xuất và điều kiện sử dụng thực tế để chọn chu kỳ thay nhớt phù hợp.", Category = "Bảo dưỡng", PostStatus = "Published", PublishedAt = now.AddDays(-8), AuthorId = authorId, CreatedDate = now },
            new Post { Title = "Những dấu hiệu cần kiểm tra má phanh", Slug = "dau-hieu-can-kiem-tra-ma-phanh", Summary = "Chủ động kiểm tra để đảm bảo an toàn.", Body = "Âm thanh bất thường, hành trình phanh dài và cảm giác phanh kém là những dấu hiệu cần kiểm tra sớm.", Category = "Bảo dưỡng", PostStatus = "Draft", AuthorId = authorId, CreatedDate = now },
        };
        db.Posts.AddRange(posts.Where(x => !postSlugs.Contains(x.Slug)));

        if (!await db.Faqs.AnyAsync())
        {
            db.Faqs.AddRange(
                new Faq { Question = "Cửa hàng có hỗ trợ trả góp không?", Answer = "Có. Nhân viên sẽ tư vấn hồ sơ và phương án phù hợp tại showroom.", Category = "Thanh toán", SortOrder = 1, CreatedDate = now },
                new Faq { Question = "Phụ tùng có được bảo hành không?", Answer = "Chính sách bảo hành phụ thuộc từng loại phụ tùng và nhà sản xuất.", Category = "Bảo hành", SortOrder = 2, CreatedDate = now },
                new Faq { Question = "Có thể nhận xe tại showroom không?", Answer = "Có. Khách hàng có thể chọn nhận tại showroom khi đặt hàng.", Category = "Giao nhận", SortOrder = 3, CreatedDate = now });
        }
        if (!await db.ContactRequests.AnyAsync())
        {
            db.ContactRequests.AddRange(
                new ContactRequest { FullName = "Nguyễn Minh Anh", Phone = "0909123456", Email = "minhanh@example.com", Subject = "Tư vấn xe tay ga", Body = "Tôi cần tư vấn xe tay ga đi làm trong thành phố.", Type = "Consultation", ContactStatus = "New", CreatedDate = now.AddDays(-2) },
                new ContactRequest { FullName = "Trần Quốc Huy", Phone = "0912233445", Subject = "Đăng ký lái thử", Body = "Tôi muốn lái thử Winner X cuối tuần.", Type = "TestDrive", ContactStatus = "New", CreatedDate = now.AddDays(-1) });
        }
        if (!await db.HomeBanners.AnyAsync())
        {
            db.HomeBanners.AddRange(
                new HomeBanner { Position = "Slider", Title = "Khám phá xe máy chính hãng", ImageUrl = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=80", Link = "/motorcycles", SortOrder = 1, CreatedDate = now },
                new HomeBanner { Position = "Slider", Title = "Phụ tùng và bảo dưỡng", ImageUrl = "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80", Link = "/parts", SortOrder = 2, CreatedDate = now });
        }
    }
}
