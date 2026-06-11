namespace MoToSale.APIService.Uploads;

public class UploadFileRequest
{
    public IFormFile File { get; set; } = null!;
}

public class UploadProductImageRequest : UploadFileRequest
{
    public int? SkuId { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public string? Alt { get; set; }
}
