using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class RemapOrderPaymentStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Gom về 2 trục: OrderStatus(4) + PaymentStatus(5). Remap dữ liệu cũ.
            migrationBuilder.Sql(@"
UPDATE [Orders] SET [OrderStatus] = 'Pending'   WHERE [OrderStatus] IN ('AwaitingPayment','Confirmed');
UPDATE [Orders] SET [OrderStatus] = 'Shipping'  WHERE [OrderStatus] = 'Allocated';
UPDATE [Orders] SET [OrderStatus] = 'Delivered' WHERE [OrderStatus] = 'Completed';
UPDATE [Orders] SET [PaymentStatus] = 'Paid'    WHERE [PaymentStatus] IN ('DepositPaid','PartiallyPaid') AND [RemainingAmount] <= 0;
UPDATE [Orders] SET [PaymentStatus] = 'Unpaid'  WHERE [PaymentStatus] IN ('DepositPaid','PartiallyPaid');
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
