using System.Security.Claims;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Services.Audit;
using MoToSale.Services.Inventory;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;
    private readonly IAuditLogService _auditLogs;

    public InventoryController(IInventoryService inventory, IAuditLogService auditLogs)
    {
        _inventory = inventory;
        _auditLogs = auditLogs;
    }

    private int? CurrentUserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdText, out int userId))
            {
                return userId;
            }

            return null;
        }
    }

    private string? CurrentActorName
    {
        get
        {
            string? name = User.FindFirstValue(ClaimTypes.Name);

            if (!string.IsNullOrWhiteSpace(name))
            {
                return name;
            }

            return User.FindFirstValue(ClaimTypes.Email);
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetInventory([FromQuery] InventorySearchRequest request)
    {
        var result = await _inventory.GetInventoryAsync(request);
        return Ok(result);
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements([FromQuery] int? skuId)
    {
        List<StockMovementDto> items = await _inventory.GetMovementsAsync(skuId);
        return Ok(new ItemsResponse<StockMovementDto> { Items = items });
    }

    [HttpGet("documents")]
    public async Task<IActionResult> SearchDocuments([FromQuery] PagingRequest request, [FromQuery] string? status, [FromQuery] int? type)
    {
        var result = await _inventory.SearchDocumentsAsync(request, status, type);
        return Ok(result);
    }

    [HttpGet("document-list")]
    public async Task<IActionResult> SearchStockDocumentList([FromQuery] StockDocumentSearchRequest request)
    {
        var result = await _inventory.SearchStockDocumentListAsync(request);
        return Ok(result);
    }

    [HttpGet("documents/{id:int}")]
    public async Task<IActionResult> GetDocument(int id)
    {
        var document = await _inventory.GetDocumentAsync(id);

        if (document == null)
        {
            return NotFound();
        }

        return Ok(document);
    }

    [HttpGet("goods-receipts")]
    public async Task<IActionResult> SearchGoodsReceipts([FromQuery] PagingRequest request)
    {
        var result = await _inventory.SearchGoodsReceiptsAsync(request);
        return Ok(result);
    }

    [HttpGet("goods-receipts/{id:int}")]
    public async Task<IActionResult> GetGoodsReceipt(int id)
    {
        var receipt = await _inventory.GetGoodsReceiptAsync(id);

        if (receipt == null)
        {
            return NotFound();
        }

        return Ok(receipt);
    }

    [HttpPost("documents")]
    public async Task<IActionResult> CreateDocument(CreateStockDocumentRequest request)
    {
        bool isReceiptDocument = request.Type == (int)StockDocumentType.Receipt;
        bool isAdmin = User.IsInRole(RoleConstant.Admin);

        if (isReceiptDocument && !isAdmin)
        {
            return Forbid();
        }

        try
        {
            var id = await _inventory.CreateDocumentAsync(request, CurrentUserId);
            await _auditLogs.AddAsync("StockDocument", id.ToString(), "Create", $"Type={request.Type};Lines={request.Lines.Count}", CurrentUserId, CurrentActorName);
            return Ok(new IdResponse { Id = id });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("documents/{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        try
        {
            var document = await _inventory.GetDocumentAsync(id);
            bool isReceiptDocument = document?.Document.Type == (int)StockDocumentType.Receipt;
            bool isAdmin = User.IsInRole(RoleConstant.Admin);

            if (isReceiptDocument && !isAdmin)
            {
                return Forbid();
            }

            await _inventory.ApproveDocumentAsync(id, CurrentUserId);
            await _auditLogs.AddAsync("StockDocument", id.ToString(), "Approve", null, CurrentUserId, CurrentActorName);
            return Ok(new MessageResponse { Message = "Duyệt phiếu thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("documents/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        try
        {
            await _inventory.CancelDocumentAsync(id);
            await _auditLogs.AddAsync("StockDocument", id.ToString(), "Cancel", null, CurrentUserId, CurrentActorName);
            return Ok(new MessageResponse { Message = "Hủy phiếu thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("holds")]
    public async Task<IActionResult> GetHolds()
    {
        List<HoldDto> items = await _inventory.GetHoldsAsync();
        return Ok(new ItemsResponse<HoldDto> { Items = items });
    }

    [HttpGet("adjustments")]
    public async Task<IActionResult> GetAdjustments([FromQuery] int? skuId)
    {
        List<StockMovementDto> items = await _inventory.GetMovementsAsync(skuId);
        return Ok(new ItemsResponse<StockMovementDto> { Items = items });
    }

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust(AdjustStockRequest request)
    {
        bool isImport = request.TransactionType == "Import";
        bool isAdmin = User.IsInRole(RoleConstant.Admin);

        if (isImport && !isAdmin)
        {
            return Forbid();
        }

        try
        {
            await _inventory.AdjustStockAsync(request, CurrentUserId);
            await _auditLogs.AddAsync("Inventory", request.SkuId.ToString(), "Adjust", $"Type={request.TransactionType};Qty={request.Qty};Reason={request.Reason}", CurrentUserId, CurrentActorName);
            return Ok(new MessageResponse { Message = "Điều chỉnh tồn thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPut("threshold")]
    public async Task<IActionResult> UpdateThreshold(UpdateThresholdRequest request)
    {
        try
        {
            await _inventory.UpdateThresholdAsync(request);
            await _auditLogs.AddAsync("InventoryThreshold", request.SkuId.ToString(), "Update", $"ReorderPoint={request.ReorderPoint}", CurrentUserId, CurrentActorName);
            return Ok(new MessageResponse { Message = "Cập nhật ngưỡng thành công." });
        }
        catch (InventoryException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        var changed = await _inventory.SyncAsync();
        await _auditLogs.AddAsync("Inventory", "Ledger", "Sync", $"Changed={changed}", CurrentUserId, CurrentActorName);
        return Ok(new ChangedMessageResponse
        {
            Message = $"Đồng bộ tồn theo sổ cái xong ({changed} dòng điều chỉnh).",
            Changed = changed
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var rows = await _inventory.ExportAsync();
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("TonKho");
        var headers = new[] { "SKU", "Sản phẩm", "Tồn thực tế", "Đang giữ", "Khả dụng", "Ngưỡng thấp", "Cập nhật" };
        for (int i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            sheet.Cell(i + 2, 1).Value = row.SkuCode;
            sheet.Cell(i + 2, 2).Value = row.ProductName;
            sheet.Cell(i + 2, 3).Value = row.OnHand;
            sheet.Cell(i + 2, 4).Value = row.Reserved;
            sheet.Cell(i + 2, 5).Value = row.Available;
            sheet.Cell(i + 2, 6).Value = row.ReorderPoint;
            if (row.UpdatedAt.HasValue)
            {
                sheet.Cell(i + 2, 7).Value = row.UpdatedAt.Value;
            }
        }
        sheet.Row(1).Style.Font.Bold = true;
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"ton-kho-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
    }
}
