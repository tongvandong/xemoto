using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Common.Helpers;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;

public partial class UserManagementService : IUserManagementService
{
    private readonly IUserRepository _users;
    private readonly IAddressRepository _addresses;
    private readonly IAuthService _auth;
    private readonly IPasswordHasher _hasher;

    public UserManagementService(IUserRepository users, IAddressRepository addresses, IAuthService auth, IPasswordHasher hasher)
    {
        _users = users;
        _addresses = addresses;
        _auth = auth;
        _hasher = hasher;
    }
}
