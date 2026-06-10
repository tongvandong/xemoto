using MoToSale.Common;

namespace MoToSale.Entities.Identity;

public class Address : BaseEntity
{
    public int UserId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line { get; set; } = string.Empty;
    public string? Ward { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public bool IsDefault { get; set; }

    public User User { get; set; } = null!;
}
