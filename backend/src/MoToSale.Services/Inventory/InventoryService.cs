using Microsoft.EntityFrameworkCore;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Inventory;
using MoToSale.Entities.Inventory;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;

namespace MoToSale.Services.Inventory;

public partial class InventoryService : IInventoryService
{
    private static readonly Dictionary<string, string> ReceiptReasons = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OpeningBalance"] = "Tồn đầu kỳ",
        ["Supplement"] = "Nhập bù",
        ["Gift"] = "Hàng tặng",
        ["Other"] = "Khác",
    };

    private readonly IInventoryRepository _inventory;
    private readonly IStockDocumentRepository _documents;
    private readonly IReservationRepository _reservations;
    private readonly AppDbContext _db;

    public InventoryService(IInventoryRepository inventory, IStockDocumentRepository documents, IReservationRepository reservations, AppDbContext db)
    {
        _inventory = inventory;
        _documents = documents;
        _reservations = reservations;
        _db = db;
    }
}
