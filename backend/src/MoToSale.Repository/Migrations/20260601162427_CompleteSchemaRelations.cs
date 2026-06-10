using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class CompleteSchemaRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_PerformedBy",
                table: "StockMovements",
                column: "PerformedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_ApprovedBy",
                table: "StockDocuments",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockDocuments_CreatedBy",
                table: "StockDocuments",
                column: "CreatedBy");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockDocuments_Stores",
                table: "StockDocuments",
                sql: "[ToStoreId] IS NULL OR [ToStoreId] <> [StoreId]");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId_SkuId",
                table: "ProductImages",
                columns: new[] { "ProductId", "SkuId" },
                unique: true,
                filter: "[IsPrimary] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_SkuId",
                table: "ProductImages",
                column: "SkuId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId",
                table: "Posts",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_RecordedBy",
                table: "Payments",
                column: "RecordedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PartCompatibilities_BrandId",
                table: "PartCompatibilities",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_PartCompatibilities_VehicleModelId",
                table: "PartCompatibilities",
                column: "VehicleModelId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PartCompatibilities_Years",
                table: "PartCompatibilities",
                sql: "[YearFrom] IS NULL OR [YearTo] IS NULL OR [YearFrom] <= [YearTo]");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_ChangedBy",
                table: "OrderStatusHistories",
                column: "ChangedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderStatusHistories_Users_ChangedBy",
                table: "OrderStatusHistories",
                column: "ChangedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PartCompatibilities_Brands_BrandId",
                table: "PartCompatibilities",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PartCompatibilities_VehicleModels_VehicleModelId",
                table: "PartCompatibilities",
                column: "VehicleModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Users_RecordedBy",
                table: "Payments",
                column: "RecordedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Users_AuthorId",
                table: "Posts",
                column: "AuthorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductImages_Skus_SkuId",
                table: "ProductImages",
                column: "SkuId",
                principalTable: "Skus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockDocuments_Users_ApprovedBy",
                table: "StockDocuments",
                column: "ApprovedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockDocuments_Users_CreatedBy",
                table: "StockDocuments",
                column: "CreatedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_Users_PerformedBy",
                table: "StockMovements",
                column: "PerformedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderStatusHistories_Users_ChangedBy",
                table: "OrderStatusHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_PartCompatibilities_Brands_BrandId",
                table: "PartCompatibilities");

            migrationBuilder.DropForeignKey(
                name: "FK_PartCompatibilities_VehicleModels_VehicleModelId",
                table: "PartCompatibilities");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Users_RecordedBy",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Users_AuthorId",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductImages_Skus_SkuId",
                table: "ProductImages");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Users_ApprovedBy",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockDocuments_Users_CreatedBy",
                table: "StockDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Users_PerformedBy",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_PerformedBy",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_ApprovedBy",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_StockDocuments_CreatedBy",
                table: "StockDocuments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockDocuments_Stores",
                table: "StockDocuments");

            migrationBuilder.DropIndex(
                name: "IX_ProductImages_ProductId_SkuId",
                table: "ProductImages");

            migrationBuilder.DropIndex(
                name: "IX_ProductImages_SkuId",
                table: "ProductImages");

            migrationBuilder.DropIndex(
                name: "IX_Posts_AuthorId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Payments_RecordedBy",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_PartCompatibilities_BrandId",
                table: "PartCompatibilities");

            migrationBuilder.DropIndex(
                name: "IX_PartCompatibilities_VehicleModelId",
                table: "PartCompatibilities");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PartCompatibilities_Years",
                table: "PartCompatibilities");

            migrationBuilder.DropIndex(
                name: "IX_OrderStatusHistories_ChangedBy",
                table: "OrderStatusHistories");
        }
    }
}
