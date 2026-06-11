using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;
public partial class ContentService
{
    public async Task<PagingResponse<PostListItem>> SearchPostsAsync(PagingRequest request, string? status)
    {
        var allPosts = await _posts.GetAllAsync();
        IEnumerable<Post> query = allPosts;

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(post => post.PostStatus == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            query = query.Where(post => post.Title.Contains(request.Keyword, StringComparison.OrdinalIgnoreCase));
        }

        var orderedPosts = query.OrderByDescending(post => post.Id).ToList();
        var items = orderedPosts
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(MapPostListItem)
            .ToList();

        return new PagingResponse<PostListItem>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = orderedPosts.Count,
        };
    }

    public async Task<List<PostListItem>> GetPublishedPostsAsync()
    {
        var allPosts = await _posts.GetAllAsync();

        return allPosts
            .Where(post => post.PostStatus == PublishedStatus)
            .OrderByDescending(post => post.PublishedAt ?? post.CreatedDate)
            .Select(MapPostListItem)
            .ToList();
    }

    public async Task<PostDto?> GetPostAsync(int id)
    {
        var post = await _posts.GetByIdAsync(id);
        if (post == null)
        {
            return null;
        }

        return MapPostDto(post);
    }

    public async Task<int> CreatePostAsync(SavePostRequest request, int? authorId)
    {
        ValidatePostRequest(request);

        string slug = BuildPostSlug(request);
        bool slugAlreadyExists = await _posts.AnyAsync(post => post.Slug == slug);
        if (slugAlreadyExists)
        {
            throw new ContentException("Slug đã tồn tại.");
        }

        var post = new Post
        {
            Title = request.Title.Trim(),
            Slug = slug,
            Summary = request.Summary,
            Body = request.Body ?? string.Empty,
            CoverUrl = request.CoverUrl,
            Category = request.Category,
            PostStatus = NormalizePostStatus(request.PostStatus),
            PublishedAt = GetPublishedAt(request),
            AuthorId = authorId,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        _posts.Add(post);
        await _posts.SaveChangesAsync();

        return post.Id;
    }

    public async Task UpdatePostAsync(int id, SavePostRequest request)
    {
        ValidatePostRequest(request);

        var post = await _posts.GetByIdAsync(id);
        if (post == null)
        {
            throw new ContentException("Không tìm thấy bài viết.");
        }

        post.Title = request.Title.Trim();
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            post.Slug = request.Slug.Trim();
        }
        post.Summary = request.Summary;
        post.Body = request.Body ?? string.Empty;
        post.CoverUrl = request.CoverUrl;
        post.Category = request.Category;
        post.PostStatus = NormalizePostStatus(request.PostStatus);

        if (post.PostStatus == PublishedStatus && post.PublishedAt == null)
        {
            post.PublishedAt = request.PublishedAt ?? DateTime.UtcNow;
        }

        post.UpdatedDate = DateTime.UtcNow;

        _posts.Update(post);
        await _posts.SaveChangesAsync();
    }

    public async Task DeletePostAsync(int id)
    {
        var post = await _posts.GetByIdAsync(id);
        if (post == null)
        {
            throw new ContentException("Không tìm thấy bài viết.");
        }

        _posts.Delete(post);
        await _posts.SaveChangesAsync();
    }
    private static void ValidatePostRequest(SavePostRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ContentException("Tiêu đề là bắt buộc.");
        }
    }
    private static string BuildPostSlug(SavePostRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            return request.Slug.Trim();
        }

        return Slugify(request.Title);
    }

    private static string NormalizePostStatus(string status)
    {
        if (status == PublishedStatus)
        {
            return PublishedStatus;
        }

        return DraftStatus;
    }

    private static DateTime? GetPublishedAt(SavePostRequest request)
    {
        if (NormalizePostStatus(request.PostStatus) != PublishedStatus)
        {
            return request.PublishedAt;
        }

        return request.PublishedAt ?? DateTime.UtcNow;
    }
    private static PostListItem MapPostListItem(Post post)
    {
        return new PostListItem(post.Id, post.Title, post.Slug, post.Category, post.PostStatus, post.PublishedAt, post.CreatedDate);
    }

    private static PostDto MapPostDto(Post post)
    {
        return new PostDto(post.Id, post.Title, post.Slug, post.Summary, post.Body, post.CoverUrl, post.Category, post.PostStatus, post.PublishedAt);
    }
    private static string Slugify(string value)
    {
        string text = value.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var characters = text.Where(character =>
            System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) != System.Globalization.UnicodeCategory.NonSpacingMark);

        text = new string(characters.ToArray())
            .Normalize(System.Text.NormalizationForm.FormC)
            .Replace('đ', 'd');

        return System.Text.RegularExpressions.Regex.Replace(text, "[^a-z0-9]+", "-").Trim('-');
    }
}
