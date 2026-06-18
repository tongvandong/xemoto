using MoToSale.Common;
using MoToSale.Repository.Inventory;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Hosting;

/// <summary>
/// Job nền chạy mỗi phút:
///  (1) tự hủy các đơn online quá hạn giữ chỗ mà khách chưa thanh toán (Pending + Unpaid + reservation Active hết hạn);
///  (2) tự hủy đơn "Chờ xác nhận chuyển khoản" (PendingConfirmation) có phiếu CK chờ quá lâu — tránh hàng bị
///      giữ vĩnh viễn khi khách báo CK nhưng không thực trả.
/// Dùng lại CancelOrderAsync để mọi bước (nhả giữ chỗ, trừ Reserved, hoàn lượt voucher, đổi trạng thái)
/// đi qua một nguồn logic duy nhất. Đơn đã cọc (giữ chỗ Confirmed) vẫn được giữ tới khi giao/hủy thủ công.
/// </summary>
public class ReservationCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReservationCleanupService> _logger;

    public ReservationCleanupService(IServiceScopeFactory scopeFactory, ILogger<ReservationCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                await ReleaseExpiredOrdersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi dọn đơn hết hạn giữ chỗ.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ReleaseExpiredOrdersAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var reservations = scope.ServiceProvider.GetRequiredService<IReservationRepository>();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderService>();

        // (1) Đơn chưa thanh toán, hết hạn giữ chỗ.
        List<int> orderIds = await reservations.GetExpiredActiveOrderIdsAsync(DateTime.UtcNow);

        foreach (int orderId in orderIds)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            var order = await orders.GetOrderAsync(orderId);
            if (order is null || order.OrderStatus != OrderStatus.Pending || order.PaymentStatus != PaymentStatus.Unpaid)
            {
                continue;
            }

            try
            {
                await orders.CancelOrderAsync(orderId, "Hết hạn giữ chỗ — hệ thống tự động hủy.", null);
                _logger.LogInformation("Đã tự động hủy đơn {OrderId} do hết hạn giữ chỗ.", orderId);
            }
            catch (OrderException)
            {
                // Đơn vừa được đổi trạng thái bởi luồng khác — bỏ qua, vòng sau xử lý nếu còn.
            }
        }

        // (2) Đơn báo chuyển khoản nhưng chờ xác nhận quá lâu (48h) → tự hủy để nhả giữ chỗ.
        try
        {
            int cancelled = await orders.CancelStaleTransferClaimsAsync(TransferClaimGraceHours, null);
            if (cancelled > 0)
            {
                _logger.LogInformation("Đã tự động hủy {Count} đơn chờ xác nhận chuyển khoản quá hạn.", cancelled);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi hủy đơn chờ xác nhận chuyển khoản quá hạn.");
        }
    }

    // Thời gian chờ xác nhận chuyển khoản tối đa trước khi tự hủy (giờ).
    private const int TransferClaimGraceHours = 48;
}
