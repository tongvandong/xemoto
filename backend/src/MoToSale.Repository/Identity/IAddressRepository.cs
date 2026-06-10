using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public interface IAddressRepository : IRepository<Address>
{
    Task<List<Address>> GetByUserAsync(int userId);
    Task ClearDefaultAsync(int userId);
}
