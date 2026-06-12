using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderFulfillmentPickupFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'FulfillmentNote') IS NULL
                BEGIN
                    ALTER TABLE [Orders] ADD [FulfillmentNote] nvarchar(1000) NULL;
                END

                IF COL_LENGTH(N'[Orders]', N'PickupAppointmentAt') IS NULL
                BEGIN
                    ALTER TABLE [Orders] ADD [PickupAppointmentAt] datetime2(0) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'FulfillmentNote') IS NOT NULL
                BEGIN
                    ALTER TABLE [Orders] DROP COLUMN [FulfillmentNote];
                END

                IF COL_LENGTH(N'[Orders]', N'PickupAppointmentAt') IS NOT NULL
                BEGIN
                    ALTER TABLE [Orders] DROP COLUMN [PickupAppointmentAt];
                END
                """);
        }
    }
}
