using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;

namespace MoToSale.Services.Catalog;

public partial class CatalogService
{
    public async Task<PagingResponse<BrandDto>> SearchBrandsAsync(BrandSearchRequest request)
    {
        IQueryable<Brand> query = _db.Brands.AsNoTracking();

        query = query.Where(brand => brand.Status != (int)EntityStatus.Deleted);

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword.Trim();
            query = query.Where(brand =>
                brand.Name.Contains(keyword)
                || brand.Slug.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            string slug = request.Slug.Trim();
            query = query.Where(brand => brand.Slug.Contains(slug));
        }

        if (request.Status.HasValue)
        {
            int status = request.Status.Value;
            query = query.Where(brand => brand.Status == status);
        }
        else
        {
            query = query.Where(brand => brand.Status == (int)EntityStatus.Active);
        }

        if (request.HasLogo.HasValue)
        {
            if (request.HasLogo.Value)
            {
                query = query.Where(brand => brand.LogoUrl != null && brand.LogoUrl != string.Empty);
            }
            else
            {
                query = query.Where(brand => brand.LogoUrl == null || brand.LogoUrl == string.Empty);
            }
        }

        query = ApplyBrandSorting(query, request.SortBy, request.SortDescending);

        int totalItems = await query.CountAsync();
        List<BrandDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(brand => new BrandDto(brand.Id, brand.Name, brand.Slug, brand.LogoUrl, brand.Status))
            .ToListAsync();

        return new PagingResponse<BrandDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<PagingResponse<VehicleModelDto>> SearchVehicleModelsAsync(VehicleModelSearchRequest request)
    {
        IQueryable<VehicleModel> query = _db.VehicleModels.AsNoTracking();

        query = query.Where(model => model.Status != (int)EntityStatus.Deleted);

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword.Trim();
            query = query.Where(model =>
                model.Name.Contains(keyword)
                || model.Slug.Contains(keyword)
                || model.Brand.Name.Contains(keyword));
        }

        if (request.BrandId.HasValue)
        {
            int brandId = request.BrandId.Value;
            query = query.Where(model => model.BrandId == brandId);
        }

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            string slug = request.Slug.Trim();
            query = query.Where(model => model.Slug.Contains(slug));
        }

        if (request.Status.HasValue)
        {
            int status = request.Status.Value;
            query = query.Where(model => model.Status == status);
        }
        else
        {
            query = query.Where(model => model.Status == (int)EntityStatus.Active);
        }

        query = ApplyVehicleModelSorting(query, request.SortBy, request.SortDescending);

        int totalItems = await query.CountAsync();
        List<VehicleModelDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(model => new VehicleModelDto(model.Id, model.BrandId, model.Name, model.Slug, model.Status, model.Brand.Name))
            .ToListAsync();

        return new PagingResponse<VehicleModelDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    public async Task<PagingResponse<ManufacturerDto>> SearchManufacturersAsync(ManufacturerSearchRequest request)
    {
        IQueryable<Manufacturer> query = _db.Manufacturers.AsNoTracking();

        query = query.Where(manufacturer => manufacturer.Status != (int)EntityStatus.Deleted);

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            string keyword = request.Keyword.Trim();
            query = query.Where(manufacturer =>
                manufacturer.Name.Contains(keyword)
                || (manufacturer.Description != null && manufacturer.Description.Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(request.Description))
        {
            string description = request.Description.Trim();
            query = query.Where(manufacturer =>
                manufacturer.Description != null
                && manufacturer.Description.Contains(description));
        }

        if (request.Status.HasValue)
        {
            int status = request.Status.Value;
            query = query.Where(manufacturer => manufacturer.Status == status);
        }
        else
        {
            query = query.Where(manufacturer => manufacturer.Status == (int)EntityStatus.Active);
        }

        if (request.HasLogo.HasValue)
        {
            if (request.HasLogo.Value)
            {
                query = query.Where(manufacturer => manufacturer.LogoUrl != null && manufacturer.LogoUrl != string.Empty);
            }
            else
            {
                query = query.Where(manufacturer => manufacturer.LogoUrl == null || manufacturer.LogoUrl == string.Empty);
            }
        }

        query = ApplyManufacturerSorting(query, request.SortBy, request.SortDescending);

        int totalItems = await query.CountAsync();
        List<ManufacturerDto> items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(manufacturer => new ManufacturerDto(
                manufacturer.Id,
                manufacturer.Name,
                manufacturer.LogoUrl,
                manufacturer.Description,
                manufacturer.Status))
            .ToListAsync();

        return new PagingResponse<ManufacturerDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = totalItems
        };
    }

    private static IQueryable<Brand> ApplyBrandSorting(
        IQueryable<Brand> query,
        string? sortBy,
        bool sortDescending)
    {
        string field = (sortBy ?? "id").ToLowerInvariant();

        if (field == "name")
        {
            return sortDescending ? query.OrderByDescending(brand => brand.Name) : query.OrderBy(brand => brand.Name);
        }

        if (field == "slug")
        {
            return sortDescending ? query.OrderByDescending(brand => brand.Slug) : query.OrderBy(brand => brand.Slug);
        }

        if (field == "status")
        {
            return sortDescending ? query.OrderByDescending(brand => brand.Status) : query.OrderBy(brand => brand.Status);
        }

        return sortDescending ? query.OrderByDescending(brand => brand.Id) : query.OrderBy(brand => brand.Id);
    }

    private static IQueryable<VehicleModel> ApplyVehicleModelSorting(
        IQueryable<VehicleModel> query,
        string? sortBy,
        bool sortDescending)
    {
        string field = (sortBy ?? "id").ToLowerInvariant();

        if (field == "brand")
        {
            return sortDescending ? query.OrderByDescending(model => model.Brand.Name) : query.OrderBy(model => model.Brand.Name);
        }

        if (field == "name")
        {
            return sortDescending ? query.OrderByDescending(model => model.Name) : query.OrderBy(model => model.Name);
        }

        if (field == "slug")
        {
            return sortDescending ? query.OrderByDescending(model => model.Slug) : query.OrderBy(model => model.Slug);
        }

        if (field == "status")
        {
            return sortDescending ? query.OrderByDescending(model => model.Status) : query.OrderBy(model => model.Status);
        }

        return sortDescending ? query.OrderByDescending(model => model.Id) : query.OrderBy(model => model.Id);
    }

    private static IQueryable<Manufacturer> ApplyManufacturerSorting(
        IQueryable<Manufacturer> query,
        string? sortBy,
        bool sortDescending)
    {
        string field = (sortBy ?? "id").ToLowerInvariant();

        if (field == "name")
        {
            return sortDescending ? query.OrderByDescending(manufacturer => manufacturer.Name) : query.OrderBy(manufacturer => manufacturer.Name);
        }

        if (field == "description")
        {
            return sortDescending
                ? query.OrderByDescending(manufacturer => manufacturer.Description ?? string.Empty)
                : query.OrderBy(manufacturer => manufacturer.Description ?? string.Empty);
        }

        if (field == "status")
        {
            return sortDescending ? query.OrderByDescending(manufacturer => manufacturer.Status) : query.OrderBy(manufacturer => manufacturer.Status);
        }

        return sortDescending ? query.OrderByDescending(manufacturer => manufacturer.Id) : query.OrderBy(manufacturer => manufacturer.Id);
    }
}
