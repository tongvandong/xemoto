using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using MoToSale.Repository;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260617090000_RepairInstallmentApplicationsSchema")]
    public partial class RepairInstallmentApplicationsSchema : Migration
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
                ELSE
                BEGIN
                    IF COL_LENGTH(N'InstallmentApplications', N'CustomerId') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [CustomerId] int NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'CustomerEmail') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [CustomerEmail] nvarchar(max) NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'ProductId') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [ProductId] int NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'SkuId') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [SkuId] int NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'FinancePartner') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [FinancePartner] nvarchar(max) NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'DownPayment') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [DownPayment] decimal(18,2) NOT NULL CONSTRAINT [DF_InstallmentApplications_DownPayment] DEFAULT 0;
                    IF COL_LENGTH(N'InstallmentApplications', N'Months') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [Months] int NOT NULL CONSTRAINT [DF_InstallmentApplications_Months] DEFAULT 0;
                    IF COL_LENGTH(N'InstallmentApplications', N'Note') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [Note] nvarchar(max) NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'ApplicationStatus') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [ApplicationStatus] nvarchar(max) NOT NULL CONSTRAINT [DF_InstallmentApplications_ApplicationStatus] DEFAULT N'Pending';
                    IF COL_LENGTH(N'InstallmentApplications', N'OrderId') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [OrderId] int NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'HandledBy') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [HandledBy] int NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'HandledAt') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [HandledAt] datetime2 NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'CreatedDate') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [CreatedDate] datetime2 NOT NULL CONSTRAINT [DF_InstallmentApplications_CreatedDate] DEFAULT SYSUTCDATETIME();
                    IF COL_LENGTH(N'InstallmentApplications', N'UpdatedDate') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [UpdatedDate] datetime2 NULL;
                    IF COL_LENGTH(N'InstallmentApplications', N'Status') IS NULL
                        ALTER TABLE [InstallmentApplications] ADD [Status] int NOT NULL CONSTRAINT [DF_InstallmentApplications_Status] DEFAULT 1;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
