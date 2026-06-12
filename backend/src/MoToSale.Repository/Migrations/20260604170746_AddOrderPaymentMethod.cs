using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderPaymentMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'PaymentMethod') IS NULL
                BEGIN
                    ALTER TABLE [Orders] ADD [PaymentMethod] varchar(20) NOT NULL CONSTRAINT [DF_Orders_PaymentMethod] DEFAULT 'COD';
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'PaymentMethod') IS NOT NULL
                BEGIN
                    DECLARE @constraintName sysname;

                    SELECT @constraintName = [dc].[name]
                    FROM [sys].[default_constraints] [dc]
                    INNER JOIN [sys].[columns] [c] ON [dc].[parent_object_id] = [c].[object_id] AND [dc].[parent_column_id] = [c].[column_id]
                    WHERE [dc].[parent_object_id] = OBJECT_ID(N'[Orders]') AND [c].[name] = N'PaymentMethod';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC(N'ALTER TABLE [Orders] DROP CONSTRAINT [' + @constraintName + N']');
                    END

                    ALTER TABLE [Orders] DROP COLUMN [PaymentMethod];
                END
                """);
        }
    }
}
