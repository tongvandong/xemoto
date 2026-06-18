using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;
public partial class BusinessOperationsService
{
    public async Task<BusinessLookupResponse> GetLookupsAsync()
    {
        List<LookupOrderDto> deliveredOrders = await GetDeliveredOrdersForLookupAsync();
        List<LookupUserDto> users = await GetUsersForLookupAsync();
        List<int> staffIds = await GetUserIdsByRoleAsync("Staff");
        List<int> customerIds = await GetUserIdsByRoleAsync("Customer");

        return new BusinessLookupResponse
        {
            Skus = await GetSkusForLookupAsync(),
            Suppliers = await GetSuppliersForLookupAsync(),
            Customers = users.Where(user => customerIds.Contains(user.Id)).ToList(),
            Staff = users.Where(user => staffIds.Contains(user.Id)).ToList(),
            Orders = deliveredOrders
        };
    }
    private async Task<List<LookupOrderDto>> GetDeliveredOrdersForLookupAsync()
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(order => order.OrderStatus == OrderStatus.Delivered)
            .OrderByDescending(order => order.Id)
            .Select(order => new LookupOrderDto
            {
                Id = order.Id,
                Code = order.Code,
                UserId = order.UserId,
                ShippingRecipient = order.ShippingRecipient,
                ShippingPhone = order.ShippingPhone,
                PlacedAt = order.PlacedAt,
                GrandTotal = order.GrandTotal,
                Lines = order.Lines.Select(line => new LookupOrderLineDto
                {
                    Id = line.Id,
                    SkuId = line.SkuId,
                    ProductNameSnapshot = line.ProductNameSnapshot,
                    SkuCodeSnapshot = line.SkuCodeSnapshot,
                    Qty = line.Qty,
                    UnitPrice = line.UnitPrice
                }).ToList()
            })
            .ToListAsync();
    }

    private async Task<List<LookupUserDto>> GetUsersForLookupAsync()
    {
        return await _db.Users
            .AsNoTracking()
            .OrderBy(user => user.FullName)
            .Select(user => new LookupUserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber
            })
            .ToListAsync();
    }

    private async Task<List<int>> GetUserIdsByRoleAsync(string role)
    {
        return await _db.UserRoles
            .AsNoTracking()
            .Where(userRole => userRole.Role.Code == role)
            .Select(userRole => userRole.UserId)
            .Distinct()
            .ToListAsync();
    }

    private async Task<List<LookupSkuDto>> GetSkusForLookupAsync()
    {
        return await _db.Skus
            .AsNoTracking()
            // Bỏ SKU của sản phẩm đã xóa mềm (status = Deleted) khỏi ô chọn đơn mua hàng/nhập kho/sửa chữa.
            .Where(sku => sku.Product.Status != (int)EntityStatus.Deleted)
            .OrderBy(sku => sku.SkuCode)
            .Select(sku => new LookupSkuDto
            {
                Id = sku.Id,
                SkuCode = sku.SkuCode,
                VariantName = sku.VariantName,
                ProductName = sku.Product.Name
            })
            .ToListAsync();
    }

    private async Task<List<LookupSupplierDto>> GetSuppliersForLookupAsync()
    {
        return await _db.Suppliers
            .AsNoTracking()
            .Where(supplier => supplier.Status == 1)
            .OrderBy(supplier => supplier.Name)
            .Select(supplier => new LookupSupplierDto
            {
                Id = supplier.Id,
                Code = supplier.Code,
                Name = supplier.Name
            })
            .ToListAsync();
    }
}
