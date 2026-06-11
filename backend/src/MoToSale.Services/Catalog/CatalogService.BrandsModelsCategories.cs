using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace MoToSale.Services.Catalog;
public partial class CatalogService
{
    public async Task<int> CreateBrandAsync(CreateBrandRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên hãng là bắt buộc.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _brands.AnyAsync(b => b.Slug == slug)) throw new CatalogException("Slug hãng đã tồn tại.");
        var brand = new Brand { Name = r.Name.Trim(), Slug = slug, LogoUrl = r.LogoUrl, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _brands.Add(brand);
        await _brands.SaveChangesAsync();
        return brand.Id;
    }

    public async Task UpdateBrandAsync(int id, UpdateBrandRequest r)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        brand.Name = r.Name.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) brand.Slug = r.Slug!.Trim();
        if (r.LogoUrl != null) brand.LogoUrl = r.LogoUrl;
        brand.Status = r.Status;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    public async Task SetBrandLogoAsync(int id, string url)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        brand.LogoUrl = url;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    public async Task DeleteBrandAsync(int id)
    {
        var brand = await _brands.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy hãng.");
        if (await _models.AnyAsync(m => m.BrandId == id && m.Status == (int)EntityStatus.Active))
            throw new CatalogException("Hãng còn dòng xe đang dùng, không thể xóa.");
        if (await _products.AnyAsync(p => p.BrandId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Hãng còn sản phẩm đang bán, không thể xóa.");
        // Xóa mềm: ẩn khỏi danh sách/chọn, giữ tham chiếu cho dữ liệu cũ.
        brand.Status = (int)EntityStatus.Inactive;
        brand.UpdatedDate = DateTime.UtcNow;
        _brands.Update(brand);
        await _brands.SaveChangesAsync();
    }

    // ===== Dòng xe =====
    public async Task<int> CreateModelAsync(CreateModelRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên dòng xe là bắt buộc.");
        if (!await _brands.AnyAsync(b => b.Id == r.BrandId)) throw new CatalogException("Hãng không hợp lệ.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _models.AnyAsync(m => m.Slug == slug)) throw new CatalogException("Slug dòng xe đã tồn tại.");
        var model = new VehicleModel { BrandId = r.BrandId, Name = r.Name.Trim(), Slug = slug, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _models.Add(model);
        await _models.SaveChangesAsync();
        return model.Id;
    }

    public async Task UpdateModelAsync(int id, UpdateModelRequest r)
    {
        var model = await _models.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy dòng xe.");
        model.BrandId = r.BrandId;
        model.Name = r.Name.Trim();
        if (!string.IsNullOrWhiteSpace(r.Slug)) model.Slug = r.Slug!.Trim();
        model.Status = r.Status;
        model.UpdatedDate = DateTime.UtcNow;
        _models.Update(model);
        await _models.SaveChangesAsync();
    }

    public async Task DeleteModelAsync(int id)
    {
        var model = await _models.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy dòng xe.");
        if (await _products.AnyAsync(p => p.VehicleModelId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Dòng xe còn sản phẩm đang bán, không thể xóa.");
        model.Status = (int)EntityStatus.Inactive;
        model.UpdatedDate = DateTime.UtcNow;
        _models.Update(model);
        await _models.SaveChangesAsync();
    }

    // ===== Danh mục =====
    private static bool IsSystemRootCategory(Category category) =>
        category.ParentId is null && (category.Slug == "xe-may" || category.Slug == "phu-tung");

    private static int KindFromSystemRootSlug(string slug) =>
        slug == "xe-may" ? (int)ProductKind.Motorcycle : (int)ProductKind.Part;

    private async Task<Category> GetValidCategoryParentAsync(int? parentId)
    {
        if (!parentId.HasValue)
            throw new CatalogException("Danh mục mới phải nằm dưới Xe máy hoặc Phụ tùng.");

        var parent = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c =>
            c.Id == parentId.Value &&
            c.Status != (int)EntityStatus.Inactive &&
            c.Status != (int)EntityStatus.Deleted);

        if (parent is null)
            throw new CatalogException("Danh mục cha không hợp lệ.");

        if (!IsSystemRootCategory(parent))
            throw new CatalogException("Danh mục cha chỉ được là Xe máy hoặc Phụ tùng.");

        return parent;
    }

    public async Task<int> CreateCategoryAsync(CreateCategoryRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new CatalogException("Tên danh mục là bắt buộc.");
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slugify(r.Name) : r.Slug!.Trim();
        if (await _categories.AnyAsync(c => c.Slug == slug)) throw new CatalogException("Slug danh mục đã tồn tại.");

        int kind;
        if (r.ParentId is null)
        {
            if (slug != "xe-may" && slug != "phu-tung")
                throw new CatalogException("Chỉ được tạo danh mục con dưới Xe máy hoặc Phụ tùng.");

            kind = KindFromSystemRootSlug(slug);
        }
        else
        {
            var parent = await GetValidCategoryParentAsync(r.ParentId);
            kind = parent.Kind;
        }

        var cat = new Category { ParentId = r.ParentId, Name = r.Name.Trim(), Slug = slug, Kind = kind, SortOrder = r.SortOrder, CreatedDate = DateTime.UtcNow, Status = (int)EntityStatus.Active };
        _categories.Add(cat);
        await _categories.SaveChangesAsync();
        return cat.Id;
    }

    public async Task UpdateCategoryAsync(int id, UpdateCategoryRequest r)
    {
        var cat = await _categories.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy danh mục.");
        if (r.ParentId == id) throw new CatalogException("Danh mục không thể là cha của chính nó.");

        var currentIsSystemRoot = IsSystemRootCategory(cat);
        if (currentIsSystemRoot)
        {
            if (r.ParentId is not null)
                throw new CatalogException("Danh mục gốc hệ thống không thể chuyển thành danh mục con.");
            cat.ParentId = null;
            cat.Kind = KindFromSystemRootSlug(cat.Slug);
        }
        else
        {
            var parent = await GetValidCategoryParentAsync(r.ParentId);
            cat.ParentId = parent.Id;
            cat.Kind = parent.Kind;
        }

        cat.Name = r.Name.Trim();
        if (currentIsSystemRoot && !string.IsNullOrWhiteSpace(r.Slug) && r.Slug.Trim() != cat.Slug)
            throw new CatalogException("Không thể đổi slug danh mục gốc hệ thống.");
        if (!string.IsNullOrWhiteSpace(r.Slug)) cat.Slug = r.Slug!.Trim();
        cat.SortOrder = r.SortOrder;
        cat.Status = currentIsSystemRoot ? (int)EntityStatus.Active : r.Status;
        cat.UpdatedDate = DateTime.UtcNow;
        _categories.Update(cat);
        await _categories.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(int id)
    {
        var cat = await _categories.GetByIdAsync(id) ?? throw new CatalogException("Không tìm thấy danh mục.");
        if (IsSystemRootCategory(cat))
            throw new CatalogException("Không thể xóa danh mục gốc Xe máy hoặc Phụ tùng.");
        if (await _categories.AnyAsync(c => c.ParentId == id && c.Status == (int)EntityStatus.Active))
            throw new CatalogException("Danh mục còn danh mục con đang dùng, không thể xóa.");
        if (await _products.AnyAsync(p => p.CategoryId == id && p.Status == (int)EntityStatus.Active))
            throw new CatalogException("Danh mục còn sản phẩm đang bán, không thể xóa.");
        cat.Status = (int)EntityStatus.Inactive;
        cat.UpdatedDate = DateTime.UtcNow;
        _categories.Update(cat);
        await _categories.SaveChangesAsync();
    }
}
