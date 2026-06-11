using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;
public partial class ContentService
{
    public async Task<List<BannerDto>> GetBannersAsync(bool all)
    {
        var banners = await _banners.GetAllAsync();
        IEnumerable<HomeBanner> query = banners;

        if (!all)
        {
            query = query.Where(banner => banner.Status == (int)EntityStatus.Active);
        }

        return query
            .OrderBy(banner => banner.Position)
            .ThenBy(banner => banner.SortOrder)
            .Select(MapBannerDto)
            .ToList();
    }

    public async Task<int> CreateBannerAsync(SaveBannerRequest request)
    {
        ValidateBannerRequest(request);

        var banner = new HomeBanner
        {
            Position = request.Position,
            Title = request.Title,
            ImageUrl = request.ImageUrl.Trim(),
            Link = request.Link,
            SortOrder = request.SortOrder,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        _banners.Add(banner);
        await _banners.SaveChangesAsync();

        return banner.Id;
    }

    public async Task UpdateBannerAsync(int id, SaveBannerRequest request)
    {
        ValidateBannerRequest(request);

        var banner = await _banners.GetByIdAsync(id);
        if (banner == null)
        {
            throw new ContentException("Không tìm thấy banner.");
        }

        banner.Position = request.Position;
        banner.Title = request.Title;
        banner.ImageUrl = request.ImageUrl.Trim();
        banner.Link = request.Link;
        banner.SortOrder = request.SortOrder;
        banner.Status = request.Status;
        banner.UpdatedDate = DateTime.UtcNow;

        _banners.Update(banner);
        await _banners.SaveChangesAsync();
    }

    public async Task DeleteBannerAsync(int id)
    {
        var banner = await _banners.GetByIdAsync(id);
        if (banner == null)
        {
            throw new ContentException("Không tìm thấy banner.");
        }

        _banners.Delete(banner);
        await _banners.SaveChangesAsync();
    }
    private static void ValidateBannerRequest(SaveBannerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            throw new ContentException("Ảnh banner là bắt buộc.");
        }
    }
    private static BannerDto MapBannerDto(HomeBanner banner)
    {
        return new BannerDto(banner.Id, banner.Position, banner.Title, banner.ImageUrl, banner.Link, banner.SortOrder, banner.Status);
    }
}
