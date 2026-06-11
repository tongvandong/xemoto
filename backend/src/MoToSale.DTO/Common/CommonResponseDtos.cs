namespace MoToSale.DTO.Common;

public class IdResponse
{
    public int Id { get; set; }
}

public class MessageResponse
{
    public string Message { get; set; } = string.Empty;
}

public class UrlResponse
{
    public string Url { get; set; } = string.Empty;
}

public class ChangedMessageResponse
{
    public string Message { get; set; } = string.Empty;

    public int Changed { get; set; }
}

public class ItemsResponse<T>
{
    public List<T> Items { get; set; } = new List<T>();
}
