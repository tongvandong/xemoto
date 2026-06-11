using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Payments;
public partial class PaymentService
{
    public async Task CancelAsync(int id, string? reason)
    {
        var payment = await _payments.GetByIdAsync(id);
        if (payment == null)
        {
            throw new PaymentException("Không tìm thấy phiếu thanh toán.");
        }

        if (payment.PaymentRecordStatus == PaymentRecordStatus.Cancelled)
        {
            throw new PaymentException("Phiếu đã hủy.");
        }

        DateTime now = DateTime.UtcNow;

        payment.PaymentRecordStatus = PaymentRecordStatus.Cancelled;
        payment.Note = BuildCancelNote(payment.Note, reason);
        payment.UpdatedDate = now;
        _payments.Update(payment);

        AddPaymentReversal(payment, now);
        await UpdateOrderAfterPaymentCancelledAsync(payment, now);

        await _payments.SaveChangesAsync();
    }
    private void AddPaymentReversal(Payment payment, DateTime now)
    {
        _db.CashTransactions.Add(new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}",
            TransactionType = "Payment",
            Category = "PaymentReversal",
            Amount = payment.Amount,
            Method = payment.Method,
            ReferenceType = "Payment",
            ReferenceId = payment.OrderId,
            Note = $"Đảo phiếu thu {payment.Code}",
            OccurredAt = now,
            CreatedDate = now,
        });
    }

    private static string? BuildCancelNote(string? oldNote, string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            return oldNote;
        }

        if (string.IsNullOrWhiteSpace(oldNote))
        {
            return $"Hủy: {reason}";
        }

        return $"{oldNote} | Hủy: {reason}";
    }
    private async Task UpdateOrderAfterPaymentCancelledAsync(Payment payment, DateTime now)
    {
        var order = await _orders.GetByIdAsync(payment.OrderId);
        if (order == null)
        {
            return;
        }

        string paymentStatusBefore = order.PaymentStatus;
        decimal totalPaid = await _payments.GetTotalPaidAsync(order.Id) - payment.Amount;

        order.RemainingAmount = Math.Max(0, order.GrandTotal - totalPaid);
        if (totalPaid >= order.GrandTotal)
        {
            order.PaymentStatus = PaymentStatus.Paid;
        }
        else
        {
            order.PaymentStatus = PaymentStatus.Unpaid;
        }
        order.UpdatedDate = now;

        _orders.Update(order);
        AddPaymentStatusHistoryIfChanged(order, paymentStatusBefore, "Hủy ghi nhận thanh toán", null, now);
    }

    private void AddPaymentStatusHistoryIfChanged(Order order, string oldStatus, string note, int? userId, DateTime now)
    {
        if (order.PaymentStatus == oldStatus)
        {
            return;
        }

        _orders.AddStatusHistory(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = oldStatus,
            ToStatus = order.PaymentStatus,
            Note = note,
            ChangedBy = userId,
            CreatedDate = now,
        });
    }
}
