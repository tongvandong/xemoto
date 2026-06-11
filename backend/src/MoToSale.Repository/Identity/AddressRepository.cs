using Microsoft.EntityFrameworkCore;
using MoToSale.Entities.Identity;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Identity;

public class AddressRepository : Repository<Address>, IAddressRepository
{
    public AddressRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<Address>> GetByUserAsync(int userId)
    {
        List<Address> addresses = await Query
            .AsNoTracking()
            .Where(address => address.UserId == userId)
            .OrderByDescending(address => address.IsDefault)
            .ThenBy(address => address.Id)
            .ToListAsync();

        return addresses;
    }

    public async Task ClearDefaultAsync(int userId)
    {
        List<Address> defaultAddresses = await Query
            .Where(address => address.UserId == userId && address.IsDefault)
            .ToListAsync();

        foreach (Address address in defaultAddresses)
        {
            address.IsDefault = false;
        }
    }
}
