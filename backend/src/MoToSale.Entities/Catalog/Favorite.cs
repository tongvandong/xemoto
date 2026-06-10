using MoToSale.Common;

namespace MoToSale.Entities.Catalog;

/// <summary>Sản phẩm yêu thích của khách hàng (storefront).</summary>
public class Favorite : BaseEntity
{
    public int UserId { get; set; }
    public int ProductId { get; set; }
}
