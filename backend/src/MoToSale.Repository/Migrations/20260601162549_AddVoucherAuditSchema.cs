using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddVoucherAuditSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrderLineId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Entity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OldValueJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValueJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActorId = table.Column<int>(type: "int", nullable: true),
                    ActorName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    At = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderVouchers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    VoucherCodeSnapshot = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderVouchers", x => x.Id);
                    table.CheckConstraint("CK_OrderVouchers_DiscountAmount", "[DiscountAmount] >= 0");
                    table.ForeignKey(
                        name: "FK_OrderVouchers_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VoucherRedemptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VoucherId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RedeemedAt = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VoucherRedemptions", x => x.Id);
                    table.CheckConstraint("CK_VoucherRedemptions_Amount", "[Amount] >= 0");
                    table.ForeignKey(
                        name: "FK_VoucherRedemptions_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VoucherRedemptions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VoucherRedemptions_Vouchers_VoucherId",
                        column: x => x.VoucherId,
                        principalTable: "Vouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VoucherScopes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VoucherId = table.Column<int>(type: "int", nullable: false),
                    ScopeType = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    RefId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VoucherScopes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VoucherScopes_Vouchers_VoucherId",
                        column: x => x.VoucherId,
                        principalTable: "Vouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_OrderLineId",
                table: "Warranties",
                column: "OrderLineId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorId",
                table: "AuditLogs",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Entity_EntityId_At",
                table: "AuditLogs",
                columns: new[] { "Entity", "EntityId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderVouchers_OrderId",
                table: "OrderVouchers",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VoucherRedemptions_OrderId",
                table: "VoucherRedemptions",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_VoucherRedemptions_UserId",
                table: "VoucherRedemptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VoucherRedemptions_VoucherId_OrderId",
                table: "VoucherRedemptions",
                columns: new[] { "VoucherId", "OrderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VoucherScopes_VoucherId_ScopeType_RefId",
                table: "VoucherScopes",
                columns: new[] { "VoucherId", "ScopeType", "RefId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_OrderLines_OrderLineId",
                table: "Warranties",
                column: "OrderLineId",
                principalTable: "OrderLines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_OrderLines_OrderLineId",
                table: "Warranties");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "OrderVouchers");

            migrationBuilder.DropTable(
                name: "VoucherRedemptions");

            migrationBuilder.DropTable(
                name: "VoucherScopes");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_OrderLineId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "OrderLineId",
                table: "Warranties");
        }
    }
}
