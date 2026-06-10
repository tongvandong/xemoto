namespace MoToSale.Common;

/// <summary>Entity cơ sở dùng chung (theo khuôn BaseCore): Id, thời gian tạo/cập nhật, trạng thái.</summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public int Status { get; set; } = (int)EntityStatus.Active;
}

public enum EntityStatus
{
    Deleted = -1,
    Inactive = 0,
    Active = 1,
}
