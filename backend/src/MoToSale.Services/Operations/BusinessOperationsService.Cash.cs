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
    public async Task<ItemsResponse<CashTransactionDto>> GetCashTransactionsAsync()
    {
        List<CashTransactionDto> items = await _db.CashTransactions
            .AsNoTracking()
            .OrderByDescending(transaction => transaction.Id)
            .Select(transaction => new CashTransactionDto
            {
                Id = transaction.Id,
                Code = transaction.Code,
                TransactionType = transaction.TransactionType,
                Category = transaction.Category,
                Amount = transaction.Amount,
                Method = transaction.Method,
                ReferenceType = transaction.ReferenceType,
                ReferenceId = transaction.ReferenceId,
                Note = transaction.Note,
                OccurredAt = transaction.OccurredAt
            })
            .ToListAsync();

        return new ItemsResponse<CashTransactionDto> { Items = items };
    }

    public async Task<int> CreateCashTransactionAsync(CashTransactionRequest request, int? userId)
    {
        ValidateCashTransactionRequest(request);

        DateTime now = DateTime.UtcNow;
        var transaction = new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}",
            TransactionType = request.TransactionType,
            Category = request.Category,
            Amount = request.Amount,
            Method = request.Method,
            ReferenceType = request.ReferenceType,
            ReferenceId = request.ReferenceId,
            Note = request.Note,
            RecordedBy = userId,
            OccurredAt = request.OccurredAt ?? now,
            CreatedDate = now
        };

        _db.CashTransactions.Add(transaction);
        await _db.SaveChangesAsync();
        return transaction.Id;
    }

    public async Task<int> ReverseCashTransactionAsync(int id, int? userId)
    {
        CashTransaction source = await _db.CashTransactions.FindAsync(id)
            ?? throw new BusinessOperationsException("Không tìm thấy phiếu thu chi.");

        bool alreadyReversed = await _db.CashTransactions.AnyAsync(transaction =>
            transaction.ReferenceType == "CashReversal" &&
            transaction.ReferenceId == id);

        if (alreadyReversed)
        {
            throw new BusinessOperationsException("Phiếu thu chi đã được đảo.");
        }

        DateTime now = DateTime.UtcNow;
        var reversal = new CashTransaction
        {
            Code = $"CT{now:yyyyMMddHHmmssfff}",
            TransactionType = source.TransactionType == "Receipt" ? "Payment" : "Receipt",
            Category = "Reversal",
            Amount = source.Amount,
            Method = source.Method,
            ReferenceType = "CashReversal",
            ReferenceId = id,
            Note = $"Đảo phiếu {source.Code}",
            RecordedBy = userId,
            OccurredAt = now,
            CreatedDate = now
        };

        _db.CashTransactions.Add(reversal);
        await _db.SaveChangesAsync();
        return reversal.Id;
    }
    private static void ValidateCashTransactionRequest(CashTransactionRequest request)
    {
        if (!IsValidCashTransactionType(request.TransactionType) || request.Amount <= 0)
        {
            throw new BusinessOperationsException("Phiếu thu chi không hợp lệ.");
        }

        if (!IsValidPaymentMethod(request.Method))
        {
            throw new BusinessOperationsException("Hình thức thanh toán không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            throw new BusinessOperationsException("Nhóm thu chi là bắt buộc.");
        }
    }

    private static bool IsValidCashTransactionType(string transactionType)
    {
        return transactionType == "Receipt" || transactionType == "Payment";
    }

    private static bool IsValidPaymentMethod(string method)
    {
        return method == "Cash" || method == "BankTransfer";
    }
}
