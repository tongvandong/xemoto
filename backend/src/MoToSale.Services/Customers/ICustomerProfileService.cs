using MoToSale.DTO.Customers;

namespace MoToSale.Services.Customers;

public interface ICustomerProfileService
{
    Task<CustomerProfileResponse?> GetProfileAsync(int customerId);
}
