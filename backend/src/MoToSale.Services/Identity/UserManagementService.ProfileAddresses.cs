using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Auth;
using MoToSale.DTO.Common;
using MoToSale.Entities.Identity;
using MoToSale.Repository.Identity;

namespace MoToSale.Services.Identity;
public partial class UserManagementService
{
    public async Task<UserResponse?> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        User user = await GetUserOrThrowAsync(userId);
        string fullName = ValidateAndNormalizeFullName(request.FullName);

        user.FullName = fullName;
        user.PhoneNumber = ValidateAndNormalizePhone(request.PhoneNumber);
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();

        return await _auth.GetProfileAsync(userId);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        User user = await GetUserOrThrowAsync(userId);

        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new UserManagementException("Mật khẩu hiện tại không đúng.");
        }

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.UpdatedDate = DateTime.UtcNow;

        await _users.SaveChangesAsync();
    }

    public async Task<ItemsResponse<AddressDto>> GetAddressesAsync(int userId)
    {
        List<Address> addresses = await _addresses.GetByUserAsync(userId);
        List<AddressDto> items = addresses.Select(MapAddress).ToList();

        return new ItemsResponse<AddressDto> { Items = items };
    }

    public async Task<int> AddAddressAsync(int userId, AddressRequest request)
    {
        if (request.IsDefault)
        {
            await _addresses.ClearDefaultAsync(userId);
        }

        var address = new Address
        {
            UserId = userId,
            RecipientName = request.RecipientName.Trim(),
            Phone = request.Phone.Trim(),
            Line = request.Line.Trim(),
            Ward = request.Ward?.Trim(),
            District = request.District?.Trim(),
            Province = request.Province?.Trim(),
            IsDefault = request.IsDefault,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active
        };

        _addresses.Add(address);
        await _addresses.SaveChangesAsync();

        return address.Id;
    }

    public async Task UpdateAddressAsync(int userId, int addressId, AddressRequest request)
    {
        Address address = await GetOwnedAddressOrThrowAsync(userId, addressId);

        // Đặt làm mặc định thì bỏ cờ mặc định của các địa chỉ khác trước.
        if (request.IsDefault && !address.IsDefault)
        {
            await _addresses.ClearDefaultAsync(userId);
        }

        address.RecipientName = request.RecipientName.Trim();
        address.Phone = request.Phone.Trim();
        address.Line = request.Line.Trim();
        address.Ward = request.Ward?.Trim();
        address.District = request.District?.Trim();
        address.Province = request.Province?.Trim();
        address.IsDefault = request.IsDefault;
        address.UpdatedDate = DateTime.UtcNow;

        await _addresses.SaveChangesAsync();
    }

    public async Task SetDefaultAddressAsync(int userId, int addressId)
    {
        Address address = await GetOwnedAddressOrThrowAsync(userId, addressId);

        await _addresses.ClearDefaultAsync(userId);
        address.IsDefault = true;
        address.UpdatedDate = DateTime.UtcNow;

        await _addresses.SaveChangesAsync();
    }

    public async Task DeleteAddressAsync(int userId, int addressId)
    {
        Address address = await GetOwnedAddressOrThrowAsync(userId, addressId);

        _addresses.Delete(address);
        await _addresses.SaveChangesAsync();
    }

    // Lấy địa chỉ theo id và kiểm tra đúng chủ sở hữu; sai chủ thì coi như không tìm thấy.
    private async Task<Address> GetOwnedAddressOrThrowAsync(int userId, int addressId)
    {
        Address? address = await _addresses.GetByIdAsync(addressId);

        if (address == null || address.UserId != userId)
        {
            throw new UserManagementException("Không tìm thấy địa chỉ.");
        }

        return address;
    }
}
