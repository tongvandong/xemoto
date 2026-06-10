using MoToSale.DTO.Catalog;

namespace MoToSale.Services.Catalog;

public interface IFavoriteService
{
    Task<List<FavoriteDto>> GetMineAsync(int userId);
    Task<FavoriteDto> AddAsync(int userId, int productId);
    Task RemoveAsync(int userId, int productId);
}
