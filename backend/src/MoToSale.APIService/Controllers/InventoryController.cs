using System.Security.Claims;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Audit;
using MoToSale.Repository;
using MoToSale.Services.Inventory;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;
    private readonly AppDbContext _db;

    public InventoryController(IInventoryService inventory, AppDbContext db)
    {
        _inventory = inventory;
        _db = db;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string? CurrentActorName =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email);

    private async Task AddAuditAsync(string entity, string entityId, string action, string? newValue = null)
    {
        var now = DateTime.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            Entity = entity,
            EntityId = entityId,
            Action = action,
            NewValueJson = newValue,
            ActorId = CurrentUserId,
            ActorName = CurrentActorName,
            At = now,
            CreatedDate = now
        });
        await _db.SaveChangesAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetInventory([FromQuery] InventorySearchRequest request) =>
        Ok(await _inventory.GetInventoryAsync(request));

    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements([FromQuery] int? skuId) =>
        Ok(new { items = await _inventory.GetMovementsAsync(skuId) });

    [HttpGet("documents")]
    public async Task<IActionResult> SearchDocuments([FromQuery] PagingRequest request, [FromQuery] string? status, [FromQuery] int? type) =>
        Ok(await _inventory.SearchDocumentsAsync(request, status, type));

    [HttpGet("documents/{id:int}")]
    public async Task<IActionResult> GetDocument(int id)
    {
        var doc = await _inventory.GetDocumentAsync(id);
        return doc is null ? NotFound() : Ok(doc);
    }

    [HttpGet("goods-receipts")]
    public async Task<IActionResult> SearchGoodsReceipts([FromQuery] PagingRequest request)
    {
        var query =
            from receipt in _db.GoodsReceipts.AsNoTracking()
            join order in _db.PurchaseOrders.AsNoTracking() on receipt.PurchaseOrderId equals order.Id
            join supplier in _db.Suppliers.AsNoTracking() on order.SupplierId equals supplier.Id
            orderby receipt.ReceivedAt descending
            select new GoodsReceiptDto(
                receipt.Id, receipt.Code, order.Id, order.Code, supplier.Name,
                receipt.Note, receipt.ReceivedAt, receipt.Lines.Count);
        var total = await query.CountAsync();
        var rows = await query.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync();
        return Ok(new PagingResponse<GoodsReceiptDto> { Items = rows, Page = request.Page, PageSize = request.PageSize, TotalItems = total });
    }

    [HttpGet("goods-receipts/{id:int}")]
    public async Task<IActionResult> GetGoodsReceipt(int id)
    {
        var receipt = await (
            from row in _db.GoodsReceipts.AsNoTracking()
            join order in _db.PurchaseOrders.AsNoTracking() on row.PurchaseOrderId equals order.Id
            join supplier in _db.Suppliers.AsNoTracking() on order.SupplierId equals supplier.Id
            where row.Id == id
            select new GoodsReceiptDto(
                row.Id, row.Code, order.Id, order.Code, supplier.Name,
                row.Note, row.ReceivedAt, row.Lines.Count))
            .FirstOrDefaultAsync();
        if (receipt is null) return NotFound();
        var lines = await (
            from line in _db.GoodsReceiptLines.AsNoTracking()
            join sku in _db.Skus.AsNoTracking() on line.SkuId equals sku.Id
            join product in _db.Products.AsNoTracking() on sku.ProductId equals product.Id
            where line.GoodsReceiptId == id
            select new GoodsReceiptLineDto(line.Id, sku.Id, sku.SkuCode, product.Name, line.Qty, line.UnitCost))
            .ToListAsync();
        return Ok(new GoodsReceiptDetail(receipt, lines));
    }

    [HttpPost("documents")]
    public async Task<IActionResult> CreateDocument(CreateStockDocumentRequest request)
    {
        if (request.Type == (int)StockDocumentType.Receipt && !User.IsInRole(RoleConstant.Admin)) return Forbid();
        try
        {
            var id = await _inventory.CreateDocumentAsync(request, CurrentUserId);
            await AddAuditAsync("StockDocument", id.ToString(), "Create", $"Type={request.Type};Lines={request.Lines.Count}");
            return Ok(new { id });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("documents/{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        try
        {
            var document = await _inventory.GetDocumentAsync(id);
            if (document?.Document.Type == (int)StockDocumentType.Receipt && !User.IsInRole(RoleConstant.Admin)) return Forbid();
            await _inventory.ApproveDocumentAsync(id, CurrentUserId);
            await AddAuditAsync("StockDocument", id.ToString(), "Approve");
            return Ok(new { message = "Duyệt phiếu thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("documents/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        try
        {
            await _inventory.CancelDocumentAsync(id);
            await AddAuditAsync("StockDocument", id.ToString(), "Cancel");
            return Ok(new { message = "Hủy phiếu thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("holds")]
    public async Task<IActionResult> GetHolds() => Ok(new { items = await _inventory.GetHoldsAsync() });

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments([FromQuery] int? skuId) =>
        Ok(new { items = await _inventory.GetMovementsAsync(skuId) });

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust(AdjustStockRequest request)
    {
        if (request.TransactionType == "Import" && !User.IsInRole(RoleConstant.Admin)) return Forbid();
        try
        {
            await _inventory.AdjustStockAsync(request, CurrentUserId);
            await AddAuditAsync("Inventory", request.SkuId.ToString(), "Adjust", $"Type={request.TransactionType};Qty={request.Qty};Reason={request.Reason}");
            return Ok(new { message = "Điều chỉnh tồn thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("threshold")]
    public async Task<IActionResult> UpdateThreshold(UpdateThresholdRequest request)
    {
        try
        {
            await _inventory.UpdateThresholdAsync(request);
            await AddAuditAsync("InventoryThreshold", request.SkuId.ToString(), "Update", $"ReorderPoint={request.ReorderPoint}");
            return Ok(new { message = "Cập nhật ngưỡng thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        var changed = await _inventory.SyncAsync();
        await AddAuditAsync("Inventory", "Ledger", "Sync", $"Changed={changed}");
        return Ok(new { message = $"Đồng bộ tồn theo sổ cái xong ({changed} dòng điều chỉnh).", changed });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var rows = await _inventory.ExportAsync();
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("TonKho");
        var headers = new[] { "SKU", "Sản phẩm", "Tồn thực tế", "Đang giữ", "Khả dụng", "Ngưỡng thấp", "Cập nhật" };
        for (var i = 0; i < headers.Length; i++) sheet.Cell(1, i + 1).Value = headers[i];
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            sheet.Cell(i + 2, 1).Value = row.SkuCode;
            sheet.Cell(i + 2, 2).Value = row.ProductName;
            sheet.Cell(i + 2, 3).Value = row.OnHand;
            sheet.Cell(i + 2, 4).Value = row.Reserved;
            sheet.Cell(i + 2, 5).Value = row.Available;
            sheet.Cell(i + 2, 6).Value = row.ReorderPoint;
            if (row.UpdatedAt.HasValue) sheet.Cell(i + 2, 7).Value = row.UpdatedAt.Value;
        }
        sheet.Row(1).Style.Font.Bold = true;
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"ton-kho-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
    }
}
