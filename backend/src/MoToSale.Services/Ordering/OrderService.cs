using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Catalog;
using MoToSale.Entities.Identity;
using MoToSale.Entities.Inventory;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.EFCore;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Ordering;

// =====================================================================================
// BẢN ĐỒ TRẠNG THÁI ĐƠN HÀNG (2 trục độc lập — đọc để hiểu toàn bộ vòng đời đơn)
//
// Trục 1 — OrderStatus (giao/nhận hàng):
//   Pending (Chờ xác nhận) ──admin duyệt giao/xuất kho──▶ Shipping (Đang giao)
//        │                                                     │
//        │                                              fulfill (giao xong)
//        ▼                                                     ▼
//   Cancelled (Đã hủy) ◀──hủy khi chưa giao──            Delivered (Đã giao = hoàn tất)
//   • POS bán đứt: tạo xong lên thẳng Delivered.
//   • Chỉ hủy được khi đơn CHƯA giao (Pending/Shipping). Đã giao thì dùng phiếu đổi trả.
//
// Trục 2 — PaymentStatus (thanh toán) — KHÔNG tự kéo theo OrderStatus:
//   Unpaid (Chờ thanh toán)
//      ├─ khách báo chuyển khoản ─▶ PendingConfirmation (Chờ xác nhận CK) ─admin xác nhận─▶ Paid
//      ├─ thu đủ tiền mặt/COD ────────────────────────────────────────────────────────▶ Paid
//      ├─ hủy đơn đã thu tiền ─────────────────────────────────────────────────────────▶ Refunded
//      └─ hủy đơn đang chờ CK / CK quá hạn ────────────────────────────────────────────▶ Failed
//   • Đơn đặt cọc: chưa thu đủ vẫn là Unpaid.
//   • Đơn trả góp: cửa hàng chỉ ghi nhận khoản trả trước; phần còn lại do đối tác tài chính xử lý.
//
// Logic chia theo file partial:
//   - OrderService.Checkout.cs                : khách đặt đơn online (giữ chỗ tồn).
//   - OrderService.Pos.cs                     : bán tại quầy (POS) — bán đứt / đặt cọc / trả góp.
//   - OrderService.QueryAllocationFulfillment.cs : tra cứu, soạn/xuất kho, giao hàng, hủy, đổi trạng thái.
//   - PaymentService.*                        : ghi/xác nhận thu tiền (chỉ đổi PaymentStatus).
// =====================================================================================
public partial class OrderService : IOrderService
{
    private const int HoldMinutes = 30;

    private readonly ICartRepository _cart;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOrderRepository _orders;
    private readonly IReservationRepository _reservations;
    private readonly IInventoryRepository _inventory;
    private readonly IRepository<Sku> _skus;
    private readonly IRepository<Product> _products;
    private readonly IVoucherService _vouchers;
    private readonly IVoucherRepository _voucherRepo;
    private readonly IRepository<User> _users;
    private readonly IPaymentRepository _payments;
    private readonly AppDbContext _db;

    public OrderService(
        ICartRepository cart, IUnitOfWork unitOfWork, IOrderRepository orders, IReservationRepository reservations,
        IInventoryRepository inventory, IRepository<Sku> skus, IRepository<Product> products,
        IVoucherService vouchers, IVoucherRepository voucherRepo, IRepository<User> users, IPaymentRepository payments,
        AppDbContext db)
    {
        _cart = cart;
        _unitOfWork = unitOfWork;
        _orders = orders;
        _reservations = reservations;
        _inventory = inventory;
        _skus = skus;
        _products = products;
        _vouchers = vouchers;
        _voucherRepo = voucherRepo;
        _users = users;
        _payments = payments;
        _db = db;
    }

    private async Task<Dictionary<int, string>> UserNameMapAsync(IEnumerable<int> ids)
    {
        var idSet = ids.Distinct().ToList();
        if (idSet.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var users = await _users.FindAsync(user => idSet.Contains(user.Id));
        return users.ToDictionary(user => user.Id, user => user.FullName);
    }

    // ===== Availability =====
    private async Task<int> AvailableForSaleAsync(int skuId)
    {
        int onHand = await _inventory.GetOnHandTotalAsync(skuId);
        int reserved = await _reservations.GetActiveQtyAsync(skuId);

        return onHand - reserved;
    }
}
