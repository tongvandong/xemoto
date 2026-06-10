using Microsoft.EntityFrameworkCore;
using MoToSale.DTO.Catalog;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;

namespace MoToSale.Services.Catalog;

public class FavoriteService : IFavoriteService
{
    private readonly AppDbContext _db;
    private readonly ICatalogService _catalog;

    public FavoriteService(AppDbContext db, ICatalogService catalog)
    {
        _db = db;
        _catalog = catalog;
    }

    public async Task<List<FavoriteDto>> GetMineAsync(int userId)
    {
        var favs = await _db.Favorites
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedDate)
            .ToListAsync();

        var result = new List<FavoriteDto>(favs.Count);
        foreach (var f in favs)
        {
            var product = await _catalog.GetProductAsync(f.ProductId);
            result.Add(new FavoriteDto(f.Id, f.UserId, f.ProductId, f.CreatedDate, product));
        }
        return result;
    }

    public async Task<FavoriteDto> AddAsync(int userId, int productId)
    {
        var existing = await _db.Favorites.FirstOrDefaultAsync(f => f.UserId == userId && f.ProductId == productId);
        if (existing is null)
        {
            existing = new Favorite { UserId = userId, ProductId = productId, CreatedDate = DateTime.UtcNow };
            _db.Favorites.Add(existing);
            await _db.SaveChangesAsync();
        }
        var product = await _catalog.GetProductAsync(productId);
        return new FavoriteDto(existing.Id, userId, productId, existing.CreatedDate, product);
    }

    public async Task RemoveAsync(int userId, int productId)
    {
        var fav = await _db.Favorites.FirstOrDefaultAsync(f => f.UserId == userId && f.ProductId == productId);
        if (fav is not null)
        {
            _db.Favorites.Remove(fav);
            await _db.SaveChangesAsync();
        }
    }
}
