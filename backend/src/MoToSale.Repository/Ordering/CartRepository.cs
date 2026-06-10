using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class CartRepository : Repository<Cart>, ICartRepository
{
    public CartRepository(AppDbContext context) : base(context) { }

    public Task<Cart?> GetWithItemsAsync(int userId) =>
        Set.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);

    public async Task<Cart> GetOrCreateAsync(int userId)
    {
        var cart = await GetWithItemsAsync(userId);
        if (cart is null)
        {
            cart = new Cart { UserId = userId, CreatedDate = DateTime.UtcNow };
            Set.Add(cart);
        }
        return cart;
    }

    public Task<CartItem?> GetItemAsync(int cartId, int skuId) =>
        Context.CartItems.FirstOrDefaultAsync(i => i.CartId == cartId && i.SkuId == skuId);

    public void AddItem(CartItem item) => Context.CartItems.Add(item);

    public void RemoveItem(CartItem item) => Context.CartItems.Remove(item);

    public void ClearItems(IEnumerable<CartItem> items) => Context.CartItems.RemoveRange(items);
}
