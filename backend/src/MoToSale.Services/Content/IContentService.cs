using MoToSale.DTO.Common;
using MoToSale.DTO.Content;

namespace MoToSale.Services.Content;

public interface IContentService
{
    // Bài viết
    Task<PagingResponse<PostListItem>> SearchPostsAsync(PagingRequest request, string? status);
    Task<List<PostListItem>> GetPublishedPostsAsync();
    Task<PostDto?> GetPostAsync(int id);
    Task<int> CreatePostAsync(SavePostRequest request, int? authorId);
    Task UpdatePostAsync(int id, SavePostRequest request);
    Task DeletePostAsync(int id);

    // FAQ
    Task<List<FaqDto>> GetFaqsAsync(bool all);
    Task<int> CreateFaqAsync(SaveFaqRequest request);
    Task UpdateFaqAsync(int id, SaveFaqRequest request);
    Task DeleteFaqAsync(int id);

    // Liên hệ
    Task<PagingResponse<ContactDto>> SearchContactsAsync(PagingRequest request, string? status, string? type);
    Task<ContactDto?> GetContactAsync(int id);
    Task<int> CreateContactAsync(CreateContactRequest request);
    Task MarkContactProcessedAsync(int id);

    // Banner
    Task<List<BannerDto>> GetBannersAsync(bool all);
    Task<int> CreateBannerAsync(SaveBannerRequest request);
    Task UpdateBannerAsync(int id, SaveBannerRequest request);
    Task DeleteBannerAsync(int id);
}

public class ContentException : Exception
{
    public ContentException(string message) : base(message)
    {
    }
}
