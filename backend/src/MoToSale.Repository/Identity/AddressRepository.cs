using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public class AddressRepository : Repository<Address>, IAddressRepository
{
    public AddressRepository(AppDbContext context) : base(context) { }

    public Task<List<Address>> GetByUserAsync(int userId) =>
        Query.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault).ThenBy(a => a.Id)
            .ToListAsync();

    public async Task ClearDefaultAsync(int userId)
    {
        var defaults = await Query.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
        foreach (var d in defaults) d.IsDefault = false;
    }
}
