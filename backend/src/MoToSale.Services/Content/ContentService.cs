using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;

public class ContentService : IContentService
{
    private readonly IRepository<Post> _posts;
    private readonly IRepository<Faq> _faqs;
    private readonly IRepository<ContactRequest> _contacts;
    private readonly IRepository<HomeBanner> _banners;

    public ContentService(IRepository<Post> posts, IRepository<Faq> faqs, IRepository<ContactRequest> contacts, IRepository<HomeBanner> banners)
    {
        _posts = posts;
        _faqs = faqs;
        _contacts = contacts;
        _banners = banners;
    }

    // ===== Bài viết =====
    public async Task<PagingResponse<PostListItem>> SearchPostsAsync(PagingRequest r, string? status)
    {
        var all = await _posts.GetAllAsync();
        var q = all.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(p => p.PostStatus == status);
        if (!string.IsNullOrWhiteSpace(r.Keyword)) q = q.Where(p => p.Title.Contains(r.Keyword!, StringComparison.OrdinalIgnoreCase));
        var ordered = q.OrderByDescending(p => p.Id).ToList();
        var items = ordered.Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(p => new PostListItem(p.Id, p.Title, p.Slug, p.Category, p.PostStatus, p.PublishedAt, p.CreatedDate)).ToList();
        return new PagingResponse<PostListItem> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = ordered.Count };
    }

    public async Task<List<PostListItem>> GetPublishedPostsAsync()
    {
        var all = await _posts.GetAllAsync();
        return all.Where(p => p.PostStatus == "Published")
            .OrderByDescending(p => p.PublishedAt ?? p.CreatedDate)
            .Select(p => new PostListItem(p.Id, p.Title, p.Slug, p.Category, p.PostStatus, p.PublishedAt, p.CreatedDate))
            .ToList();
    }

    public async Task<PostDto?> GetPostAsync(int id)
    {
        var p = await _posts.GetByIdAsync(id);
        return p is null ? null : new PostDto(p.Id, p.Title, p.Slug, p.Summary, p.Body, p.CoverUrl, p.Category, p.PostStatus, p.PublishedAt);
    }

    public async Task<int> CreatePostAsync(SavePostRequest r, int? authorId)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) throw new ContentException("Tiêu đề là bắt buộc.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Title) : r.Slug!.Trim();
        if (await _posts.AnyAsync(p => p.Slug == slug)) throw new ContentException("Slug đã tồn tại.");
        var post = new Post
        {
            Title = r.Title.Trim(), Slug = slug, Summary = r.Summary, Body = r.Body ?? "", CoverUrl = r.CoverUrl,
            Category = r.Category, PostStatus = r.PostStatus == "Published" ? "Published" : "Draft",
            PublishedAt = r.PostStatus == "Published" ? (r.PublishedAt ?? DateTime.UtcNow) : r.PublishedAt,
            AuthorId = authorId, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active,
        };
        _posts.Add(post);
        await _posts.SaveChangesAsync();
        return post.Id;
    }

    public async Task UpdatePostAsync(int id, SavePostRequest r)
    {
        var p = await _posts.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy bài viết.");
        p.Title = r.Title.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) p.Slug = r.Slug!.Trim();
        p.Summary = r.Summary; p.Body = r.Body ?? ""; p.CoverUrl = r.CoverUrl; p.Category = r.Category;
        p.PostStatus = r.PostStatus == "Published" ? "Published" : "Draft";
        if (p.PostStatus == "Published" && p.PublishedAt is null) p.PublishedAt = r.PublishedAt ?? DateTime.UtcNow;
        p.UpdatedDate = DateTime.UtcNow;
        _posts.Update(p);
        await _posts.SaveChangesAsync();
    }

    public async Task DeletePostAsync(int id)
    {
        var p = await _posts.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy bài viết.");
        _posts.Delete(p);
        await _posts.SaveChangesAsync();
    }

    // ===== FAQ =====
    public async Task<List<FaqDto>> GetFaqsAsync()
    {
        var all = await _faqs.GetAllAsync();
        return all.OrderBy(f => f.SortOrder).ThenBy(f => f.Id)
            .Select(f => new FaqDto(f.Id, f.Question, f.Answer, f.Category, f.SortOrder, f.Status)).ToList();
    }

    public async Task<int> CreateFaqAsync(SaveFaqRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Question)) throw new ContentException("Câu hỏi là bắt buộc.");
        var f = new Faq { Question = r.Question.Trim(), Answer = r.Answer ?? "", Category = r.Category, SortOrder = r.SortOrder, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _faqs.Add(f);
        await _faqs.SaveChangesAsync();
        return f.Id;
    }

    public async Task UpdateFaqAsync(int id, SaveFaqRequest r)
    {
        var f = await _faqs.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy FAQ.");
        f.Question = r.Question.Trim(); f.Answer = r.Answer ?? ""; f.Category = r.Category; f.SortOrder = r.SortOrder; f.Status = r.Status; f.UpdatedDate = DateTime.UtcNow;
        _faqs.Update(f);
        await _faqs.SaveChangesAsync();
    }

    public async Task DeleteFaqAsync(int id)
    {
        var f = await _faqs.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy FAQ.");
        _faqs.Delete(f);
        await _faqs.SaveChangesAsync();
    }

    // ===== Liên hệ =====
    public async Task<PagingResponse<ContactDto>> SearchContactsAsync(PagingRequest r, string? status)
    {
        var all = await _contacts.GetAllAsync();
        var q = all.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(c => c.ContactStatus == status);
        var ordered = q.OrderByDescending(c => c.Id).ToList();
        var items = ordered.Skip((r.Page - 1) * r.PageSize).Take(r.PageSize)
            .Select(c => new ContactDto(c.Id, c.FullName, c.Phone, c.Email, c.Subject, c.Body, c.Type, c.ProductId, c.ContactStatus, c.CreatedDate, c.HandledAt)).ToList();
        return new PagingResponse<ContactDto> { Items = items, Page = r.Page, PageSize = r.PageSize, TotalItems = ordered.Count };
    }

    public async Task<int> CreateContactAsync(CreateContactRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.FullName)) throw new ContentException("Họ tên là bắt buộc.");
        if (string.IsNullOrWhiteSpace(r.Phone)) throw new ContentException("Số điện thoại là bắt buộc.");
        var c = new ContactRequest
        {
            FullName = r.FullName.Trim(),
            Phone = r.Phone.Trim(),
            Email = r.Email,
            Subject = r.Subject,
            Body = r.Body ?? "",
            Type = string.IsNullOrWhiteSpace(r.Type) ? "Consultation" : r.Type!,
            ProductId = r.ProductId,
            ContactStatus = "New",
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };
        _contacts.Add(c);
        await _contacts.SaveChangesAsync();
        return c.Id;
    }

    public async Task MarkContactProcessedAsync(int id)
    {
        var c = await _contacts.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy liên hệ.");
        c.ContactStatus = "Processed"; c.HandledAt = DateTime.UtcNow; c.UpdatedDate = DateTime.UtcNow;
        _contacts.Update(c);
        await _contacts.SaveChangesAsync();
    }

    // ===== Banner =====
    public async Task<List<BannerDto>> GetBannersAsync(bool all)
    {
        var list = await _banners.GetAllAsync();
        var q = all ? list : list.Where(b => b.Status == (int)EntityStatus.Active);
        return q.OrderBy(b => b.Position).ThenBy(b => b.SortOrder)
            .Select(b => new BannerDto(b.Id, b.Position, b.Title, b.ImageUrl, b.Link, b.SortOrder, b.Status)).ToList();
    }

    public async Task<int> CreateBannerAsync(SaveBannerRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.ImageUrl)) throw new ContentException("Ảnh banner là bắt buộc.");
        var b = new HomeBanner { Position = r.Position, Title = r.Title, ImageUrl = r.ImageUrl.Trim(), Link = r.Link, SortOrder = r.SortOrder, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _banners.Add(b);
        await _banners.SaveChangesAsync();
        return b.Id;
    }

    public async Task UpdateBannerAsync(int id, SaveBannerRequest r)
    {
        var b = await _banners.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy banner.");
        b.Position = r.Position; b.Title = r.Title; b.ImageUrl = r.ImageUrl.Trim(); b.Link = r.Link; b.SortOrder = r.SortOrder; b.Status = r.Status; b.UpdatedDate = DateTime.UtcNow;
        _banners.Update(b);
        await _banners.SaveChangesAsync();
    }

    public async Task DeleteBannerAsync(int id)
    {
        var b = await _banners.GetByIdAsync(id) ?? throw new ContentException("Không tìm thấy banner.");
        _banners.Delete(b);
        await _banners.SaveChangesAsync();
    }

    private static string Slugify(string value)
    {
        var s = value.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var chars = s.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark);
        s = new string(chars.ToArray()).Normalize(System.Text.NormalizationForm.FormC).Replace('đ', 'd');
        return System.Text.RegularExpressions.Regex.Replace(s, "[^a-z0-9]+", "-").Trim('-');
    }
}
