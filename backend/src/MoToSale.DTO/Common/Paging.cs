namespace MoToSale.DTO.Common;

public class PagingRequest
{
    private int _page = 1;
    private int _pageSize = 20;

    public int Page { get => _page; set => _page = value <= 0 ? 1 : value; }
    public int PageSize { get => _pageSize; set => _pageSize = value <= 0 ? 20 : Math.Min(value, 100); }
    public string? Keyword { get; set; }
}

public class PagingResponse<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);
}
