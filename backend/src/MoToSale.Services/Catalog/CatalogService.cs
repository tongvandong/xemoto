using MoToSale.Common;
using MoToSale.DTO.Catalog;
using MoToSale.DTO.Common;
using MoToSale.Entities.Catalog;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace MoToSale.Services.Catalog;

public partial class CatalogService : ICatalogService
{
    private readonly IProductRepository _products;
    private readonly IRepository<Category> _categories;
    private readonly IRepository<Brand> _brands;
    private readonly IRepository<VehicleModel> _models;
    private readonly ISkuRepository _skus;
    private readonly IProductImageRepository _images;
    private readonly IRepository<PartCompatibility> _compat;
    private readonly IRepository<Manufacturer> _manufacturers;
    private readonly MoToSale.Repository.Inventory.IInventoryRepository _inventory;
    private readonly AppDbContext _db;

    public CatalogService(
        IProductRepository products,
        IRepository<Category> categories,
        IRepository<Brand> brands,
        IRepository<VehicleModel> models,
        ISkuRepository skus,
        IProductImageRepository images,
        IRepository<PartCompatibility> compat,
        IRepository<Manufacturer> manufacturers,
        MoToSale.Repository.Inventory.IInventoryRepository inventory,
        AppDbContext db)
    {
        _inventory = inventory;
        _db = db;
        _products = products;
        _categories = categories;
        _brands = brands;
        _models = models;
        _skus = skus;
        _images = images;
        _compat = compat;
        _manufacturers = manufacturers;
    }
}
