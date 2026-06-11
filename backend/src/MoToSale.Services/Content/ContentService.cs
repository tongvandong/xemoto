using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;

public partial class ContentService : IContentService
{
    private const string PublishedStatus = "Published";
    private const string DraftStatus = "Draft";
    private const string NewContactStatus = "New";
    private const string ProcessedContactStatus = "Processed";

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
}
