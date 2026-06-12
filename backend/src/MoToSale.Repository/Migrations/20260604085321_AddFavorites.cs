using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[Favorites]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [Favorites] (
                        [Id] int NOT NULL IDENTITY,
                        [UserId] int NOT NULL,
                        [ProductId] int NOT NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [Status] int NOT NULL,
                        CONSTRAINT [PK_Favorites] PRIMARY KEY ([Id])
                    );
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[Favorites]', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [Favorites];
                END
                """);
        }
    }
}
