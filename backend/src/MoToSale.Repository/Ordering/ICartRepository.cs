using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public interface ICartRepository : IRepository<Cart>
{
    Task<Cart?> GetWithItemsAsync(int userId);
    Task<Cart> GetOrCreateAsync(int userId);
    Task<CartItem?> GetItemAsync(int cartId, int skuId);
    void AddItem(CartItem item);
    void RemoveItem(CartItem item);
    void ClearItems(IEnumerable<CartItem> items);
}
