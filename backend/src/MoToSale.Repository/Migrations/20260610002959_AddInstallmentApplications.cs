using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddInstallmentApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[InstallmentApplications]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [InstallmentApplications] (
                        [Id] int NOT NULL IDENTITY,
                        [Code] nvarchar(max) NOT NULL,
                        [CustomerId] int NULL,
                        [CustomerName] nvarchar(max) NOT NULL,
                        [CustomerPhone] nvarchar(max) NOT NULL,
                        [CustomerEmail] nvarchar(max) NULL,
                        [ProductId] int NULL,
                        [SkuId] int NULL,
                        [ProductSnapshot] nvarchar(max) NOT NULL,
                        [FinancePartner] nvarchar(max) NULL,
                        [DownPayment] decimal(18,2) NOT NULL,
                        [Months] int NOT NULL,
                        [Note] nvarchar(max) NULL,
                        [ApplicationStatus] nvarchar(max) NOT NULL,
                        [OrderId] int NULL,
                        [HandledBy] int NULL,
                        [HandledAt] datetime2 NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [Status] int NOT NULL,
                        CONSTRAINT [PK_InstallmentApplications] PRIMARY KEY ([Id])
                    );
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[InstallmentApplications]', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [InstallmentApplications];
                END
                """);
        }
    }
}
