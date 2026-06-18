using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class DropUnusedStaffShifts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffShifts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffShifts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ShiftStatus = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    StaffUserId = table.Column<int>(type: "int", nullable: false),
                    StartsAt = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffShifts", x => x.Id);
                    table.CheckConstraint("CK_StaffShifts_Time", "[StartsAt] < [EndsAt]");
                    table.ForeignKey(
                        name: "FK_StaffShifts_Users_AssignedBy",
                        column: x => x.AssignedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffShifts_Users_StaffUserId",
                        column: x => x.StaffUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_AssignedBy",
                table: "StaffShifts",
                column: "AssignedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_StaffUserId_StartsAt",
                table: "StaffShifts",
                columns: new[] { "StaffUserId", "StartsAt" });
        }
    }
}
