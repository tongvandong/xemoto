using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Operations;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public partial class BusinessOperationsService
{    public async Task<ItemsResponse<PurchaseOrderDto>> GetPurchaseOrdersAsync()
    {
        List<PurchaseOrder> purchaseOrders = await _db.PurchaseOrders
            .AsNoTracking()
            .Include(order => order.Supplier)
            .Include(order => order.Lines)
            .OrderByDescending(order => order.Id)
            .ToListAsync();

        List<int> skuIds = purchaseOrders
            .SelectMany(order => order.Lines)
            .Select(line => line.SkuId)
            .Distinct()
            .ToList();

        Dictionary<int, LookupSkuDto> skuMap = await GetSkuMapAsync(skuIds);

        List<PurchaseOrderDto> items = purchaseOrders
            .Select(order => MapPurchaseOrder(order, skuMap))
            .ToList();

        return new ItemsResponse<PurchaseOrderDto> { Items = items };
    }

    public async Task<int> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, int? userId)
    {
        await ValidatePurchaseOrderRequestAsync(request);

        DateTime now = DateTime.UtcNow;
        var purchaseOrder = new PurchaseOrder
        {
            Code = $"PO{now:yyyyMMddHHmmssfff}",
            SupplierId = request.SupplierId,
            Note = request.Note,
            CreatedBy = userId,
            CreatedDate = now
        };

        foreach (PurchaseLineRequest line in request.Lines)
        {
            purchaseOrder.Lines.Add(new PurchaseOrderLine
            {
                SkuId = line.SkuId,
                OrderedQty = line.Qty,
                UnitCost = line.UnitCost,
                CreatedDate = now
            });
        }

        purchaseOrder.TotalAmount = purchaseOrder.Lines.Sum(line => line.OrderedQty * line.UnitCost);

        _db.PurchaseOrders.Add(purchaseOrder);
        await _db.SaveChangesAsync();
        return purchaseOrder.Id;
    }

    public async Task ApprovePurchaseOrderAsync(int id, int? userId)
    {
        PurchaseOrder purchaseOrder = await GetPurchaseOrderOrThrowAsync(id);

        if (purchaseOrder.PurchaseStatus != "Draft")
        {
            throw new BusinessOperationsException("Chỉ đơn nháp mới được duyệt.");
        }

        purchaseOrder.PurchaseStatus = "Approved";
        purchaseOrder.ApprovedBy = userId;
        purchaseOrder.ApprovedAt = DateTime.UtcNow;
        purchaseOrder.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task CancelPurchaseOrderAsync(int id)
    {
        PurchaseOrder purchaseOrder = await GetPurchaseOrderOrThrowAsync(id);

        if (purchaseOrder.PurchaseStatus == "Received" || purchaseOrder.PurchaseStatus == "PartiallyReceived")
        {
            throw new BusinessOperationsException("Không thể hủy đơn đã nhận hàng.");
        }

        if (purchaseOrder.PaidAmount > 0)
        {
            throw new BusinessOperationsException("Không thể hủy đơn đã thanh toán. Hãy xử lý hoàn tiền NCC trước.");
        }

        purchaseOrder.PurchaseStatus = "Cancelled";
        purchaseOrder.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }
    public async Task<int> PayPurchaseOrderAsync(int id, PayPurchaseOrderRequest request, int? userId)
    {
        PurchaseOrder purchaseOrder = await GetPurchaseOrderOrThrowAsync(id);

        if (purchaseOrder.PurchaseStatus == "Cancelled" ||
            request.Amount <= 0 ||
            purchaseOrder.PaidAmount + request.Amount > purchaseOrder.TotalAmount)
        {
            throw new BusinessOperationsException("Số tiền thanh toán không hợp lệ.");
        }

        DateTime now = DateTime.UtcNow;
        purchaseOrder.PaidAmount += request.Amount;
        purchaseOrder.UpdatedDate = now;

        var cashTransaction = new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}",
            TransactionType = "Payment",
            Category = "SupplierPayment",
            Amount = request.Amount,
            Method = request.Method,
            ReferenceType = "PurchaseOrder",
            ReferenceId = id,
            Note = request.Note,
            RecordedBy = userId,
            OccurredAt = now,
            CreatedDate = now
        };

        _db.CashTransactions.Add(cashTransaction);
        await _db.SaveChangesAsync();
        return cashTransaction.Id;
    }

    private async Task<Dictionary<int, LookupSkuDto>> GetSkuMapAsync(List<int> skuIds)
    {
        if (skuIds.Count == 0)
        {
            return new Dictionary<int, LookupSkuDto>();
        }

        return await _db.Skus
            .AsNoTracking()
            .Where(sku => skuIds.Contains(sku.Id))
            .Select(sku => new LookupSkuDto
            {
                Id = sku.Id,
                SkuCode = sku.SkuCode,
                ProductName = sku.Product.Name,
                VariantName = sku.VariantName
            })
            .ToDictionaryAsync(sku => sku.Id, sku => sku);
    }

    private static PurchaseOrderDto MapPurchaseOrder(PurchaseOrder purchaseOrder, Dictionary<int, LookupSkuDto> skuMap)
    {
        return new PurchaseOrderDto
        {
            Id = purchaseOrder.Id,
            Code = purchaseOrder.Code,
            SupplierName = purchaseOrder.Supplier.Name,
            PurchaseStatus = purchaseOrder.PurchaseStatus,
            TotalAmount = purchaseOrder.TotalAmount,
            PaidAmount = purchaseOrder.PaidAmount,
            Outstanding = purchaseOrder.TotalAmount - purchaseOrder.PaidAmount,
            Note = purchaseOrder.Note,
            CreatedDate = purchaseOrder.CreatedDate,
            Lines = purchaseOrder.Lines.Select(line => MapPurchaseLine(line, skuMap)).ToList()
        };
    }

    private static PurchaseOrderLineDto MapPurchaseLine(PurchaseOrderLine line, Dictionary<int, LookupSkuDto> skuMap)
    {
        skuMap.TryGetValue(line.SkuId, out LookupSkuDto? sku);

        return new PurchaseOrderLineDto
        {
            Id = line.Id,
            SkuId = line.SkuId,
            SkuCode = sku?.SkuCode,
            ProductName = sku?.ProductName,
            OrderedQty = line.OrderedQty,
            ReceivedQty = line.ReceivedQty,
            UnitCost = line.UnitCost
        };
    }

    private async Task ValidatePurchaseOrderRequestAsync(CreatePurchaseOrderRequest request)
    {
        bool supplierIsActive = await _db.Suppliers.AnyAsync(supplier =>
            supplier.Id == request.SupplierId &&
            supplier.Status == 1);

        if (!supplierIsActive)
        {
            throw new BusinessOperationsException("Nhà cung cấp không hợp lệ.");
        }

        if (request.Lines == null || request.Lines.Count == 0)
        {
            throw new BusinessOperationsException("Đơn mua phải có dòng hàng hợp lệ.");
        }

        bool hasInvalidLine = request.Lines.Any(line => line.Qty <= 0 || line.UnitCost < 0);
        if (hasInvalidLine)
        {
            throw new BusinessOperationsException("Đơn mua phải có dòng hàng hợp lệ.");
        }

        int uniqueSkuCount = request.Lines.Select(line => line.SkuId).Distinct().Count();
        if (uniqueSkuCount != request.Lines.Count)
        {
            throw new BusinessOperationsException("Một SKU chỉ được thêm một lần trong đơn mua.");
        }

        List<int> skuIds = request.Lines.Select(line => line.SkuId).Distinct().ToList();
        int existingSkuCount = await _db.Skus.CountAsync(sku => skuIds.Contains(sku.Id));
        if (existingSkuCount != skuIds.Count)
        {
            throw new BusinessOperationsException("Đơn mua có SKU không tồn tại.");
        }
    }

    private async Task<PurchaseOrder> GetPurchaseOrderOrThrowAsync(int id)
    {
        return await _db.PurchaseOrders.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy đơn mua.");
    }
}
