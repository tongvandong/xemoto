using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.EFCore;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Ordering;
public partial class OrderService
{
    public async Task<CartDto> GetCartAsync(int userId)
    {
        var cart = await _cart.GetWithItemsAsync(userId);
        return await MapCartAsync(cart);
    }

    public async Task<CartDto> AddItemAsync(int userId, AddCartItemRequest request)
    {
        if (request.Qty <= 0)
        {
            throw new OrderException("Số lượng phải lớn hơn 0.");
        }

        var sku = await _skus.GetByIdAsync(request.SkuId);
        if (sku == null)
        {
            throw new OrderException("Không tìm thấy SKU.");
        }

        var cart = await _cart.GetOrCreateAsync(userId);
        await _cart.SaveChangesAsync();

        var existingItem = await _cart.GetItemAsync(cart.Id, request.SkuId);
        int currentQuantity = existingItem == null ? 0 : existingItem.Qty;
        int newQuantity = currentQuantity + request.Qty;
        int availableQuantity = await AvailableForSaleAsync(request.SkuId);

        if (newQuantity > availableQuantity)
        {
            throw new OrderException("Số lượng tồn khả dụng không đủ.");
        }

        decimal unitPrice = sku.SalePrice ?? sku.ListPrice;
        if (existingItem == null)
        {
            _cart.AddItem(new CartItem
            {
                CartId = cart.Id,
                SkuId = request.SkuId,
                Qty = request.Qty,
                UnitPriceSnapshot = unitPrice,
                CreatedDate = DateTime.UtcNow,
            });
        }
        else
        {
            existingItem.Qty = newQuantity;
            existingItem.UnitPriceSnapshot = unitPrice;
        }

        await _cart.SaveChangesAsync();
        return await GetCartAsync(userId);
    }

    public async Task<CartDto> UpdateItemAsync(int userId, int itemId, UpdateCartItemRequest request)
    {
        var cart = await _cart.GetWithItemsAsync(userId);
        if (cart == null)
        {
            throw new OrderException("Giỏ hàng trống.");
        }

        var item = cart.Items.FirstOrDefault(cartItem => cartItem.Id == itemId);
        if (item == null)
        {
            throw new OrderException("Không tìm thấy dòng giỏ hàng.");
        }

        if (request.Qty <= 0)
        {
            throw new OrderException("Số lượng phải lớn hơn 0.");
        }

        int availableQuantity = await AvailableForSaleAsync(item.SkuId);
        if (request.Qty > availableQuantity)
        {
            throw new OrderException("Số lượng tồn khả dụng không đủ.");
        }

        item.Qty = request.Qty;
        await _cart.SaveChangesAsync();

        return await GetCartAsync(userId);
    }

    public async Task<CartDto> RemoveItemAsync(int userId, int itemId)
    {
        var cart = await _cart.GetWithItemsAsync(userId);
        if (cart == null)
        {
            throw new OrderException("Giỏ hàng trống.");
        }

        var item = cart.Items.FirstOrDefault(cartItem => cartItem.Id == itemId);
        if (item != null)
        {
            _cart.RemoveItem(item);
            await _cart.SaveChangesAsync();
        }

        return await GetCartAsync(userId);
    }

    private async Task<CartDto> MapCartAsync(Cart? cart)
    {
        if (cart is null || cart.Items.Count == 0)
            return new CartDto(cart?.Id ?? 0, Array.Empty<CartItemDto>(), 0, 0);

        var items = new List<CartItemDto>();
        foreach (var i in cart.Items.OrderBy(x => x.Id))
        {
            var sku = await _skus.GetByIdAsync(i.SkuId);
            var product = sku is null ? null : await _products.GetByIdAsync(sku.ProductId);
            var imageUrl = product is null
                ? null
                : _db.ProductImages
                    .Where(x => x.ProductId == product.Id)
                    .OrderByDescending(x => x.SkuId == i.SkuId && x.IsPrimary)
                    .ThenByDescending(x => x.IsPrimary)
                    .ThenBy(x => x.SortOrder)
                    .Select(x => x.Url)
                    .FirstOrDefault();

            items.Add(new CartItemDto(
                i.Id,
                product?.Id ?? 0,
                i.SkuId,
                sku?.SkuCode ?? "",
                product?.Name ?? "",
                i.Qty,
                i.UnitPriceSnapshot,
                i.UnitPriceSnapshot * i.Qty,
                imageUrl));
        }
        return new CartDto(cart.Id, items, items.Sum(x => x.Qty), items.Sum(x => x.LineTotal));
    }
}
