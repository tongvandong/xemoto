using MoToSale.Common;

namespace MoToSale.Entities.Operations;

public class StaffShift : BaseEntity
{
    public int StaffUserId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public string ShiftStatus { get; set; } = "Scheduled";
    public string? Note { get; set; }
    public int? AssignedBy { get; set; }
}
