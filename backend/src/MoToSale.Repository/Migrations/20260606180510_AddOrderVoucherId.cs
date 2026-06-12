using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderVoucherId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'VoucherId') IS NULL
                BEGIN
                    ALTER TABLE [Orders] ADD [VoucherId] int NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'[Orders]', N'VoucherId') IS NOT NULL
                BEGIN
                    ALTER TABLE [Orders] DROP COLUMN [VoucherId];
                END
                """);
        }
    }
}
