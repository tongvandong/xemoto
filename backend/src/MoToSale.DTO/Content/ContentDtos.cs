using MoToSale.DTO.Common;

namespace MoToSale.DTO.Content;

// Bài viết
public record PostListItem(int Id, string Title, string Slug, string? Category, string PostStatus, DateTime? PublishedAt, DateTime CreatedDate);
public record PostDto(int Id, string Title, string Slug, string? Summary, string Body, string? CoverUrl, string? Category, string PostStatus, DateTime? PublishedAt);
public record SavePostRequest(string Title, string? Slug, string? Summary, string Body, string? CoverUrl, string? Category, string PostStatus, DateTime? PublishedAt);

// FAQ
public record FaqDto(int Id, string Question, string Answer, string? Category, int SortOrder, int Status);
public record SaveFaqRequest(string Question, string Answer, string? Category, int SortOrder, int Status);

// Liên hệ
public record ContactDto(int Id, string FullName, string Phone, string? Email, string? Subject, string Body, string Type, int? ProductId, string ContactStatus, DateTime CreatedDate, DateTime? HandledAt);
public record CreateContactRequest(string FullName, string Phone, string? Email, string? Subject, string? Body, string? Type, int? ProductId);

// Banner
public record BannerDto(int Id, string Position, string? Title, string ImageUrl, string? Link, int SortOrder, int Status);
public record SaveBannerRequest(string Position, string? Title, string ImageUrl, string? Link, int SortOrder, int Status);
