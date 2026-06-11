using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public partial class BusinessOperationsService
{    public async Task<ItemsResponse<SupplierDto>> GetSuppliersAsync()
    {
        List<SupplierDto> suppliers = await _db.Suppliers
            .AsNoTracking()
            .OrderBy(supplier => supplier.Name)
            .Select(supplier => new SupplierDto
            {
                Id = supplier.Id,
                Code = supplier.Code,
                Name = supplier.Name,
                TaxCode = supplier.TaxCode,
                ContactName = supplier.ContactName,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Address = supplier.Address,
                Note = supplier.Note,
                Status = supplier.Status
            })
            .ToListAsync();

        return new ItemsResponse<SupplierDto> { Items = suppliers };
    }

    public async Task<int> SaveSupplierAsync(int? id, SupplierRequest request)
    {
        ValidateSupplierRequest(request);

        string code = request.Code.Trim().ToUpperInvariant();
        bool codeExists = await _db.Suppliers.AnyAsync(supplier =>
            supplier.Code == code &&
            (!id.HasValue || supplier.Id != id.Value));

        if (codeExists)
        {
            throw new BusinessOperationsException("Mã nhà cung cấp đã tồn tại.");
        }

        Supplier supplier = await GetSupplierForSaveAsync(id);
        ApplySupplierRequest(supplier, request, code);

        if (!id.HasValue)
        {
            _db.Suppliers.Add(supplier);
        }

        await _db.SaveChangesAsync();
        return supplier.Id;
    }
    private static void ValidateSupplierRequest(SupplierRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BusinessOperationsException("Mã và tên nhà cung cấp là bắt buộc.");
        }
    }

    private async Task<Supplier> GetSupplierForSaveAsync(int? id)
    {
        if (!id.HasValue)
        {
            return new Supplier { CreatedDate = DateTime.UtcNow };
        }

        return await _db.Suppliers.FindAsync(id.Value)
            ?? throw new BusinessOperationsException("Không tìm thấy nhà cung cấp.");
    }

    private static void ApplySupplierRequest(Supplier supplier, SupplierRequest request, string code)
    {
        supplier.Code = code;
        supplier.Name = request.Name.Trim();
        supplier.TaxCode = request.TaxCode?.Trim();
        supplier.ContactName = request.ContactName?.Trim();
        supplier.Phone = request.Phone?.Trim();
        supplier.Email = request.Email?.Trim();
        supplier.Address = request.Address?.Trim();
        supplier.Note = request.Note?.Trim();
        supplier.Status = request.Status;
        supplier.UpdatedDate = DateTime.UtcNow;
    }
}
