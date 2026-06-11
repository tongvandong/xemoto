namespace MoToSale.Common;

public static class PaymentRecordType
{
    public const string Deposit = "Deposit";
    public const string Full = "Full";
    public const string Remaining = "Remaining";
    public const string Installment = "Installment";
}

/// <summary>Hình thức thanh toán thủ công hoặc được hệ thống ghi nhận.</summary>
public static class PaymentMethod
{
    public const string Cash = "Cash";
    public const string BankTransfer = "BankTransfer";
    public const string COD = "COD";
    public const string Card = "Card";
}

public static class PaymentRecordStatus
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Cancelled = "Cancelled";
}
