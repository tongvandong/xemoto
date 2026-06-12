namespace MoToSale.APIService.Uploads;

public interface IImageStorage
{
    Task<string> SaveAsync(IFormFile file, string folder, CancellationToken ct = default);
}

/// <summary>Lưu ảnh vào wwwroot/uploads/{folder}, trả URL tương đối /uploads/{folder}/{file}.</summary>
public class LocalImageStorage : IImageStorage
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private readonly IWebHostEnvironment _env;

    public LocalImageStorage(IWebHostEnvironment env) => _env = env;

    public async Task<string> SaveAsync(IFormFile file, string folder, CancellationToken ct = default)
    {
        if (file is null || file.Length == 0) throw new InvalidOperationException("File ảnh rỗng.");
        var ext = Path.GetExtension(file.FileName);
        if (!Allowed.Contains(ext)) throw new InvalidOperationException("Định dạng ảnh không hợp lệ.");
        if (file.Length > 5 * 1024 * 1024) throw new InvalidOperationException("Ảnh vượt quá 5MB.");

        var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(root, "uploads", folder);
        Directory.CreateDirectory(dir);

        var name = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var path = Path.Combine(dir, name);
        await using (var fs = File.Create(path))
        {
            await file.CopyToAsync(fs, ct);
        }
        return $"/uploads/{folder}/{name}";
    }
}
