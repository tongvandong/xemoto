using MoToSale.Common;

namespace MoToSale.Entities.Ordering;

public class Cart : BaseEntity
{
    public int UserId { get; set; }
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}

public class CartItem : BaseEntity
{
    public int CartId { get; set; }
    public int SkuId { get; set; }
    public int Qty { get; set; }
    public decimal UnitPriceSnapshot { get; set; }

    public Cart Cart { get; set; } = null!;
}
