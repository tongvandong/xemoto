using MoToSale.Common;

namespace MoToSale.Entities.Identity;

public class Role : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Admin | Staff | Customer
    public string Name { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
