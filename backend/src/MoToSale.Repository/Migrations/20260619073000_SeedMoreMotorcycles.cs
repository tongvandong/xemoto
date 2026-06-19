using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MoToSale.Repository;

#nullable disable

namespace MoToSale.Repository.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260619073000_SeedMoreMotorcycles")]
    public partial class SeedMoreMotorcycles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DECLARE @now datetime2 = SYSUTCDATETIME();

                IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Slug] = N'xe-may')
                BEGIN
                    INSERT INTO [Categories] ([ParentId], [Name], [Slug], [Kind], [SortOrder], [CreatedDate], [Status])
                    VALUES (NULL, N'Xe máy', N'xe-may', 1, 1, @now, 1);
                END

                DECLARE @rootMotorcycleCategoryId int = (SELECT TOP 1 [Id] FROM [Categories] WHERE [Slug] = N'xe-may');

                IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Slug] = N'xe-tay-ga')
                    INSERT INTO [Categories] ([ParentId], [Name], [Slug], [Kind], [SortOrder], [CreatedDate], [Status])
                    VALUES (@rootMotorcycleCategoryId, N'Xe tay ga', N'xe-tay-ga', 1, 10, @now, 1);

                IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Slug] = N'xe-so')
                    INSERT INTO [Categories] ([ParentId], [Name], [Slug], [Kind], [SortOrder], [CreatedDate], [Status])
                    VALUES (@rootMotorcycleCategoryId, N'Xe số', N'xe-so', 1, 20, @now, 1);

                IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Slug] = N'xe-con-tay')
                    INSERT INTO [Categories] ([ParentId], [Name], [Slug], [Kind], [SortOrder], [CreatedDate], [Status])
                    VALUES (@rootMotorcycleCategoryId, N'Xe côn tay', N'xe-con-tay', 1, 30, @now, 1);

                IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Slug] = N'xe-phan-khoi-lon')
                    INSERT INTO [Categories] ([ParentId], [Name], [Slug], [Kind], [SortOrder], [CreatedDate], [Status])
                    VALUES (@rootMotorcycleCategoryId, N'Xe phân khối lớn', N'xe-phan-khoi-lon', 1, 40, @now, 1);

                DECLARE @seed TABLE
                (
                    Code nvarchar(50) NOT NULL,
                    Name nvarchar(255) NOT NULL,
                    Slug nvarchar(280) NOT NULL,
                    CategorySlug nvarchar(180) NOT NULL,
                    BrandName nvarchar(100) NOT NULL,
                    BrandSlug nvarchar(150) NOT NULL,
                    ModelName nvarchar(120) NOT NULL,
                    ModelSlug nvarchar(160) NOT NULL,
                    ListPrice decimal(18,2) NOT NULL,
                    SalePrice decimal(18,2) NULL,
                    Stock int NOT NULL,
                    IsFeatured bit NOT NULL,
                    IsHotDeal bit NOT NULL
                );

                INSERT INTO @seed
                    ([Code], [Name], [Slug], [CategorySlug], [BrandName], [BrandSlug], [ModelName], [ModelSlug], [ListPrice], [SalePrice], [Stock], [IsFeatured], [IsHotDeal])
                VALUES
                    (N'SP-SH160', N'Honda SH160i 2025', N'honda-sh160i-2025', N'xe-tay-ga', N'Honda', N'honda', N'SH160i', N'sh160i', 92500000, NULL, 12, 1, 0),
                    (N'SP-LEAD125', N'Honda Lead 125 2025', N'honda-lead-125-2025', N'xe-tay-ga', N'Honda', N'honda', N'Lead 125', N'lead-125', 45000000, 43500000, 18, 0, 1),
                    (N'SP-GRANDE', N'Yamaha Grande 2025', N'yamaha-grande-2025', N'xe-tay-ga', N'Yamaha', N'yamaha', N'Grande', N'grande', 51000000, 49500000, 10, 0, 1),
                    (N'SP-NVX155', N'Yamaha NVX 155 VVA 2025', N'yamaha-nvx-155-vva-2025', N'xe-tay-ga', N'Yamaha', N'yamaha', N'NVX 155', N'nvx-155', 56500000, NULL, 8, 1, 0),
                    (N'SP-CLICK160', N'Honda Click 160 2025', N'honda-click-160-2025', N'xe-tay-ga', N'Honda', N'honda', N'Click 160', N'click-160', 73000000, 70500000, 6, 0, 1),
                    (N'SP-VARIO160', N'Honda Vario 160 2025', N'honda-vario-160-2025', N'xe-tay-ga', N'Honda', N'honda', N'Vario 160', N'vario-160', 56000000, 54500000, 14, 0, 1),
                    (N'SP-FUTURE125', N'Honda Future 125 FI 2025', N'honda-future-125-fi-2025', N'xe-so', N'Honda', N'honda', N'Future 125', N'future-125', 31500000, NULL, 20, 0, 0),
                    (N'SP-SIRIUSFI', N'Yamaha Sirius FI 2025', N'yamaha-sirius-fi-2025', N'xe-so', N'Yamaha', N'yamaha', N'Sirius FI', N'sirius-fi', 24000000, 23000000, 22, 0, 1),
                    (N'SP-R15', N'Yamaha YZF-R15 2025', N'yamaha-yzf-r15-2025', N'xe-con-tay', N'Yamaha', N'yamaha', N'YZF-R15', N'yzf-r15', 78000000, NULL, 5, 1, 0),
                    (N'SP-Z1000', N'Kawasaki Z1000 2025', N'kawasaki-z1000-2025', N'xe-phan-khoi-lon', N'Kawasaki', N'kawasaki', N'Z1000', N'z1000', 435000000, 420000000, 2, 1, 1);

                DECLARE
                    @code nvarchar(50),
                    @name nvarchar(255),
                    @slug nvarchar(280),
                    @categorySlug nvarchar(180),
                    @brandName nvarchar(100),
                    @brandSlug nvarchar(150),
                    @modelName nvarchar(120),
                    @modelSlug nvarchar(160),
                    @listPrice decimal(18,2),
                    @salePrice decimal(18,2),
                    @stock int,
                    @isFeatured bit,
                    @isHotDeal bit,
                    @categoryId int,
                    @brandId int,
                    @modelId int,
                    @productId int,
                    @skuId int,
                    @skuCode nvarchar(80);

                DECLARE motorcycle_cursor CURSOR LOCAL FAST_FORWARD FOR
                    SELECT [Code], [Name], [Slug], [CategorySlug], [BrandName], [BrandSlug], [ModelName], [ModelSlug], [ListPrice], [SalePrice], [Stock], [IsFeatured], [IsHotDeal]
                    FROM @seed;

                OPEN motorcycle_cursor;
                FETCH NEXT FROM motorcycle_cursor INTO @code, @name, @slug, @categorySlug, @brandName, @brandSlug, @modelName, @modelSlug, @listPrice, @salePrice, @stock, @isFeatured, @isHotDeal;

                WHILE @@FETCH_STATUS = 0
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM [Brands] WHERE [Slug] = @brandSlug)
                    BEGIN
                        INSERT INTO [Brands] ([Name], [Slug], [LogoUrl], [CreatedDate], [Status])
                        VALUES (@brandName, @brandSlug, NULL, @now, 1);
                    END

                    SELECT TOP 1 @brandId = [Id] FROM [Brands] WHERE [Slug] = @brandSlug;
                    SELECT TOP 1 @categoryId = [Id] FROM [Categories] WHERE [Slug] = @categorySlug;

                    IF NOT EXISTS (SELECT 1 FROM [VehicleModels] WHERE [Slug] = @modelSlug)
                    BEGIN
                        INSERT INTO [VehicleModels] ([BrandId], [Name], [Slug], [CreatedDate], [Status])
                        VALUES (@brandId, @modelName, @modelSlug, @now, 1);
                    END

                    SELECT TOP 1 @modelId = [Id] FROM [VehicleModels] WHERE [Slug] = @modelSlug;

                    IF NOT EXISTS (SELECT 1 FROM [Products] WHERE [Code] = @code)
                    BEGIN
                        INSERT INTO [Products]
                            ([Code], [Name], [Slug], [CategoryId], [BrandId], [VehicleModelId], [ManufacturerId], [Kind],
                             [ShortDescription], [Description], [IsFeatured], [IsHotDeal], [CreatedDate], [Status])
                        VALUES
                            (@code, @name, @slug, @categoryId, @brandId, @modelId, NULL, 1,
                             N'Xe máy seed thêm phục vụ demo danh sách và phân trang.',
                             N'Dữ liệu mẫu được thêm bằng migration SeedMoreMotorcycles.',
                             @isFeatured, @isHotDeal, @now, 1);
                    END

                    SELECT TOP 1 @productId = [Id] FROM [Products] WHERE [Code] = @code;
                    SET @skuCode = CONCAT(@code, N'-DEFAULT');

                    IF NOT EXISTS (SELECT 1 FROM [Skus] WHERE [SkuCode] = @skuCode)
                    BEGIN
                        INSERT INTO [Skus]
                            ([ProductId], [SkuCode], [VariantName], [Color], [Version], [ListPrice], [SalePrice], [Barcode], [CreatedDate], [Status])
                        VALUES
                            (@productId, @skuCode, N'Mặc định', NULL, NULL, @listPrice, @salePrice, NULL, @now, 1);
                    END

                    SELECT TOP 1 @skuId = [Id] FROM [Skus] WHERE [SkuCode] = @skuCode;

                    IF NOT EXISTS (SELECT 1 FROM [InventoryItems] WHERE [SkuId] = @skuId)
                    BEGIN
                        INSERT INTO [InventoryItems] ([SkuId], [OnHand], [Reserved], [ReorderPoint], [CreatedDate], [Status])
                        VALUES (@skuId, @stock, 0, 5, @now, 1);
                    END

                    FETCH NEXT FROM motorcycle_cursor INTO @code, @name, @slug, @categorySlug, @brandName, @brandSlug, @modelName, @modelSlug, @listPrice, @salePrice, @stock, @isFeatured, @isHotDeal;
                END

                CLOSE motorcycle_cursor;
                DEALLOCATE motorcycle_cursor;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DECLARE @codes TABLE ([Code] nvarchar(50) NOT NULL);

                INSERT INTO @codes ([Code])
                VALUES
                    (N'SP-SH160'),
                    (N'SP-LEAD125'),
                    (N'SP-GRANDE'),
                    (N'SP-NVX155'),
                    (N'SP-CLICK160'),
                    (N'SP-VARIO160'),
                    (N'SP-FUTURE125'),
                    (N'SP-SIRIUSFI'),
                    (N'SP-R15'),
                    (N'SP-Z1000');

                DELETE FROM [InventoryItems]
                WHERE [SkuId] IN (
                    SELECT [Id]
                    FROM [Skus]
                    WHERE [ProductId] IN (SELECT [Id] FROM [Products] WHERE [Code] IN (SELECT [Code] FROM @codes))
                );

                DELETE FROM [Skus]
                WHERE [ProductId] IN (SELECT [Id] FROM [Products] WHERE [Code] IN (SELECT [Code] FROM @codes));

                DELETE FROM [Products]
                WHERE [Code] IN (SELECT [Code] FROM @codes);
                """);
        }
    }
}
