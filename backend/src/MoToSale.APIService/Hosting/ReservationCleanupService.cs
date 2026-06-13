using MoToSale.Common;
using MoToSale.Repository.Inventory;
using MoToSale.Services.Ordering;

namespace MoToSale.APIService.Hosting;

/// <summary>
/// Job nền chạy mỗi phút: tự hủy các đơn online quá hạn giữ chỗ mà khách chưa thanh toán,
/// trả tồn kho về trạng thái khả dụng. Dùng lại CancelOrderAsync để mọi bước (nhả giữ chỗ,
/// trừ Reserved, hoàn lượt voucher, đổi trạng thái) đi qua một nguồn logic duy nhất.
/// Chỉ động vào đơn Pending + chưa thanh toán (Unpaid) — không đụng đơn đã báo chuyển khoản
/// (PendingConfirmation) hay đơn đã cọc (giữ chỗ đã chuyển sang Confirmed).
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
    }
}
