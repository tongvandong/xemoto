using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public class CartRepository : Repository<Cart>, ICartRepository
{
    public CartRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Cart?> GetWithItemsAsync(int userId)
    {
        Cart? cart = await Set
            .Include(item => item.Items)
            .FirstOrDefaultAsync(item => item.UserId == userId);

        return cart;
    }

    public async Task<Cart> GetOrCreateAsync(int userId)
    {
        Cart? cart = await GetWithItemsAsync(userId);

        if (cart == null)
        {
            cart = new Cart
            {
                UserId = userId,
                CreatedDate = DateTime.UtcNow
            };

            Set.Add(cart);
        }

        return cart;
    }

    public async Task<CartItem?> GetItemAsync(int cartId, int skuId)
    {
        CartItem? item = await Context.CartItems
            .FirstOrDefaultAsync(row => row.CartId == cartId && row.SkuId == skuId);

        return item;
    }

    public void AddItem(CartItem item)
    {
        Context.CartItems.Add(item);
    }

    public void RemoveItem(CartItem item)
    {
        Context.CartItems.Remove(item);
    }

    public void ClearItems(IEnumerable<CartItem> items)
    {
        Context.CartItems.RemoveRange(items);
    }
}
