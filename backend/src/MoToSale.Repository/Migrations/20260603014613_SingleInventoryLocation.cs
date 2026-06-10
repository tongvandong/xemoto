using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class SingleInventoryLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Allocations_Stores_StoreId",
                table: "Allocations");

            migrationBuilder.DropForeignKey(
                name: "FK_GoodsReceipts_Stores_StoreId",
                table: "GoodsReceipts");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Stores_StoreId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Stores_StoreId",
                table: "PurchaseOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_RepairOrders_Stores_StoreId",
                table: "RepairOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Stores_StoreId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesReturns_Stores_StoreId",
                table: "SalesReturns");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffAttendances_Stores_StoreId",
                table: "StaffAttendances");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffShifts_Stores_StoreId",
                table: "StaffShifts");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Stores_StoreId",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Stores_ToStoreId",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Stores_StoreId",
                table: "StockMovements");

            migrationBuilder.DropTable(
                name: "Stores");

            migrationBuilder.Sql("""
                ;WITH merged AS
                (
                    SELECT
                        SkuId,
                        MIN(Id) AS KeepId,
                        SUM(OnHand) AS TotalOnHand,
                        SUM(Reserved) AS TotalReserved,
                        MAX(ReorderPoint) AS ReorderPoint,
                        MIN(CreatedDate) AS CreatedDate,
                        MAX(COALESCE(UpdatedDate, CreatedDate)) AS UpdatedDate
                    FROM InventoryItems
                    GROUP BY SkuId
                )
                UPDATE target
                SET
                    OnHand = merged.TotalOnHand,
                    Reserved = CASE WHEN merged.TotalReserved > merged.TotalOnHand THEN merged.TotalOnHand ELSE merged.TotalReserved END,
                    ReorderPoint = merged.ReorderPoint,
                    CreatedDate = merged.CreatedDate,
                    UpdatedDate = merged.UpdatedDate
                FROM InventoryItems target
                INNER JOIN merged ON target.Id = merged.KeepId;

                ;WITH keep_rows AS
                (
                    SELECT SkuId, MIN(Id) AS KeepId
                    FROM InventoryItems
                    GROUP BY SkuId
                )
                DELETE duplicate
                FROM InventoryItems duplicate
                INNER JOIN keep_rows ON duplicate.SkuId = keep_rows.SkuId
                WHERE duplicate.Id <> keep_rows.KeepId;
                """);

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_SkuId",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_StoreId_SkuId_OccurredAt",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_StoreId",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_ToStoreId",
                table: "StockDocuments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockDocuments_Stores",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_StaffShifts_StoreId",
                table: "StaffShifts");

            migrationBuilder.DropIndex(
                name: "IX_StaffAttendances_StoreId",
                table: "StaffAttendances");

            migrationBuilder.DropIndex(
                name: "IX_SalesReturns_StoreId",
                table: "SalesReturns");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_StoreId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_RepairOrders_StoreId",
                table: "RepairOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_StoreId",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_StoreId_SkuId",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_GoodsReceipts_StoreId",
                table: "GoodsReceipts");

            migrationBuilder.DropIndex(
                name: "IX_Allocations_StoreId",
                table: "Allocations");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "StockDocuments");

            migrationBuilder.DropColumn(
                name: "ToStoreId",
                table: "StockDocuments");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "StaffShifts");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "StaffAttendances");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "RepairOrders");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "GoodsReceipts");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Allocations");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_SkuId_OccurredAt",
                table: "StockMovements",
                columns: new[] { "SkuId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems",
                column: "SkuId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockMovements_SkuId_OccurredAt",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems");

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "StockMovements",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "StockDocuments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ToStoreId",
                table: "StockDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "StaffShifts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "StaffAttendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "SalesReturns",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "Reservations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "RepairOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "PurchaseOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "InventoryItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "GoodsReceipts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoreId",
                table: "Allocations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Stores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AddressLine = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    District = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    OpeningHours = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Province = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Slug = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Ward = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stores", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_SkuId",
                table: "StockMovements",
                column: "SkuId");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_StoreId_SkuId_OccurredAt",
                table: "StockMovements",
                columns: new[] { "StoreId", "SkuId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_StoreId",
                table: "StockDocuments",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_ToStoreId",
                table: "StockDocuments",
                column: "ToStoreId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockDocuments_Stores",
                table: "StockDocuments",
                sql: "[ToStoreId] IS NULL OR [ToStoreId] <> [StoreId]");

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_StoreId",
                table: "StaffShifts",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffAttendances_StoreId",
                table: "StaffAttendances",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturns_StoreId",
                table: "SalesReturns",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_StoreId",
                table: "Reservations",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_RepairOrders_StoreId",
                table: "RepairOrders",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_StoreId",
                table: "PurchaseOrders",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems",
                column: "SkuId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_StoreId_SkuId",
                table: "InventoryItems",
                columns: new[] { "StoreId", "SkuId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoodsReceipts_StoreId",
                table: "GoodsReceipts",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Allocations_StoreId",
                table: "Allocations",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_Code",
                table: "Stores",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Allocations_Stores_StoreId",
                table: "Allocations",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GoodsReceipts_Stores_StoreId",
                table: "GoodsReceipts",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Stores_StoreId",
                table: "InventoryItems",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Stores_StoreId",
                table: "PurchaseOrders",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RepairOrders_Stores_StoreId",
                table: "RepairOrders",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Stores_StoreId",
                table: "Reservations",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesReturns_Stores_StoreId",
                table: "SalesReturns",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StaffAttendances_Stores_StoreId",
                table: "StaffAttendances",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StaffShifts_Stores_StoreId",
                table: "StaffShifts",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockDocuments_Stores_StoreId",
                table: "StockDocuments",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockDocuments_Stores_ToStoreId",
                table: "StockDocuments",
                column: "ToStoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_Stores_StoreId",
                table: "StockMovements",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
