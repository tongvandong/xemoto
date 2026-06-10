using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeAdminOrderStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE [Orders]
                SET [OrderStatus] = 'AwaitingPayment'
                WHERE [OrderStatus] IN ('Pending', 'Checkout', 'Confirmed');

                UPDATE [Orders]
                SET [OrderStatus] = 'Shipping'
                WHERE [OrderStatus] = 'Allocated';

                UPDATE [Orders]
                SET [OrderStatus] = 'Delivered'
                WHERE [OrderStatus] = 'Completed';

                UPDATE [Orders]
                SET [FulfillmentStatus] = 'Unallocated'
                WHERE [OrderStatus] = 'AwaitingPayment';

                UPDATE [Orders]
                SET [FulfillmentStatus] = 'Shipped'
                WHERE [OrderStatus] = 'Shipping';

                UPDATE [Orders]
                SET [FulfillmentStatus] = 'Fulfilled'
                WHERE [OrderStatus] = 'Delivered';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
