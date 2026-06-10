using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class HardenSchemaRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CareNote",
                table: "Users",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: true),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewStatus = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.CheckConstraint("CK_Reviews_Rating", "[Rating] >= 1 AND [Rating] <= 5");
                    table.ForeignKey(
                        name: "FK_Reviews_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reviews_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reviews_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Warranties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: true),
                    SkuId = table.Column<int>(type: "int", nullable: true),
                    CustomerId = table.Column<int>(type: "int", nullable: true),
                    ProductSnapshot = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    StartAt = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    Months = table.Column<int>(type: "int", nullable: false),
                    WarrantyStatus = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Warranties", x => x.Id);
                    table.CheckConstraint("CK_Warranties_Months", "[Months] > 0");
                    table.ForeignKey(
                        name: "FK_Warranties_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Warranties_Skus_SkuId",
                        column: x => x.SkuId,
                        principalTable: "Skus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Warranties_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vouchers_Values",
                table: "Vouchers",
                sql: "[DiscountValue] > 0 AND [MinOrderValue] >= 0 AND ([MaxDiscount] IS NULL OR [MaxDiscount] >= 0) AND ([UsageLimit] IS NULL OR [UsageLimit] > 0) AND ([PerUserLimit] IS NULL OR [PerUserLimit] > 0) AND [UsedCount] >= 0 AND ([StartAt] IS NULL OR [EndAt] IS NULL OR [StartAt] <= [EndAt])");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_SkuId",
                table: "StockMovements",
                column: "SkuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockMovements_Quantities",
                table: "StockMovements",
                sql: "[QtyDelta] <> 0 AND [BalanceAfter] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_StoreId",
                table: "StockDocuments",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_ToStoreId",
                table: "StockDocuments",
                column: "ToStoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocumentLines_SkuId",
                table: "StockDocumentLines",
                column: "SkuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockDocumentLines_Qty",
                table: "StockDocumentLines",
                sql: "[Qty] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Skus_Prices",
                table: "Skus",
                sql: "[ListPrice] >= 0 AND ([SalePrice] IS NULL OR ([SalePrice] >= 0 AND [SalePrice] <= [ListPrice]))");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_OrderLineId",
                table: "Reservations",
                column: "OrderLineId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_StoreId",
                table: "Reservations",
                column: "StoreId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reservations_Qty",
                table: "Reservations",
                sql: "[Qty] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payments_Amount",
                table: "Payments",
                sql: "[Amount] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Amounts",
                table: "Orders",
                sql: "[Subtotal] >= 0 AND [DiscountTotal] >= 0 AND [ShippingFee] >= 0 AND [GrandTotal] >= 0 AND [DepositAmount] >= 0 AND [RemainingAmount] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_OrderLines_SkuId",
                table: "OrderLines",
                column: "SkuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderLines_Quantities",
                table: "OrderLines",
                sql: "[Qty] > 0 AND [UnitPrice] >= 0 AND [LineTotal] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems",
                column: "SkuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_Quantities",
                table: "InventoryItems",
                sql: "[OnHand] >= 0 AND [Reserved] >= 0 AND [Reserved] <= [OnHand] AND [ReorderPoint] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_ContactRequests_ProductId",
                table: "ContactRequests",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_SkuId",
                table: "CartItems",
                column: "SkuId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CartItems_Quantities",
                table: "CartItems",
                sql: "[Qty] > 0 AND [UnitPriceSnapshot] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Allocations_Qty",
                table: "Allocations",
                sql: "[Qty] > 0");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_OrderId",
                table: "Reviews",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ProductId_ReviewStatus",
                table: "Reviews",
                columns: new[] { "ProductId", "ReviewStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_UserId",
                table: "Reviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_Code",
                table: "Warranties",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_CustomerId",
                table: "Warranties",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_OrderId",
                table: "Warranties",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_SkuId",
                table: "Warranties",
                column: "SkuId");

            migrationBuilder.AddForeignKey(
                name: "FK_Allocations_Stores_StoreId",
                table: "Allocations",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_Skus_SkuId",
                table: "CartItems",
                column: "SkuId",
                principalTable: "Skus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Carts_Users_UserId",
                table: "Carts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ContactRequests_Products_ProductId",
                table: "ContactRequests",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Skus_SkuId",
                table: "InventoryItems",
                column: "SkuId",
                principalTable: "Skus",
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
                name: "FK_OrderLines_Skus_SkuId",
                table: "OrderLines",
                column: "SkuId",
                principalTable: "Skus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderStatusHistories_Orders_OrderId",
                table: "OrderStatusHistories",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Orders_OrderId",
                table: "Payments",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_OrderLines_OrderLineId",
                table: "Reservations",
                column: "OrderLineId",
                principalTable: "OrderLines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Orders_OrderId",
                table: "Reservations",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Skus_SkuId",
                table: "Reservations",
                column: "SkuId",
                principalTable: "Skus",
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
                name: "FK_StockDocumentLines_Skus_SkuId",
                table: "StockDocumentLines",
                column: "SkuId",
                principalTable: "Skus",
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
                name: "FK_StockMovements_Skus_SkuId",
                table: "StockMovements",
                column: "SkuId",
                principalTable: "Skus",
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Allocations_Stores_StoreId",
                table: "Allocations");

            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_Skus_SkuId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Carts_Users_UserId",
                table: "Carts");

            migrationBuilder.DropForeignKey(
                name: "FK_ContactRequests_Products_ProductId",
                table: "ContactRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Skus_SkuId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Stores_StoreId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderLines_Skus_SkuId",
                table: "OrderLines");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderStatusHistories_Orders_OrderId",
                table: "OrderStatusHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Orders_OrderId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_OrderLines_OrderLineId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Orders_OrderId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Skus_SkuId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Stores_StoreId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocumentLines_Skus_SkuId",
                table: "StockDocumentLines");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Stores_StoreId",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Stores_ToStoreId",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Skus_SkuId",
                table: "StockMovements");

            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Stores_StoreId",
                table: "StockMovements");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "Warranties");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vouchers_Values",
                table: "Vouchers");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_SkuId",
                table: "StockMovements");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockMovements_Quantities",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_StoreId",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_ToStoreId",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_StockDocumentLines_SkuId",
                table: "StockDocumentLines");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockDocumentLines_Qty",
                table: "StockDocumentLines");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Skus_Prices",
                table: "Skus");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_OrderLineId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_StoreId",
                table: "Reservations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reservations_Qty",
                table: "Reservations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payments_Amount",
                table: "Payments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Amounts",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_OrderLines_SkuId",
                table: "OrderLines");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderLines_Quantities",
                table: "OrderLines");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_SkuId",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_Quantities",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_ContactRequests_ProductId",
                table: "ContactRequests");

            migrationBuilder.DropIndex(
                name: "IX_CartItems_SkuId",
                table: "CartItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CartItems_Quantities",
                table: "CartItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Allocations_Qty",
                table: "Allocations");

            migrationBuilder.DropColumn(
                name: "CareNote",
                table: "Users");
        }
    }
}
