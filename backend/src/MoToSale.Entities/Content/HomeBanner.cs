using MoToSale.Common;

namespace MoToSale.Entities.Content;

public class HomeBanner : BaseEntity
{
    public string Position { get; set; } = "Slider"; // Slider | BannerLeft | BannerRight | ProductBanner
    public string? Title { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? Link { get; set; }
    public int SortOrder { get; set; }
}
