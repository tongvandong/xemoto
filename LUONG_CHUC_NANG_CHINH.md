# Luồng chức năng chính trong MoToSale v2

Tài liệu này liệt kê các file chính mà dữ liệu đi qua cho các nhóm chức năng: xe máy, phụ tùng, hãng xe, hãng sản xuất phụ tùng, đơn hàng, voucher, khách hàng và tồn kho.

Quy ước đọc luồng:

```text
Màn hình FE -> service FE -> Controller BE -> Service BE -> Repository/DbContext -> Entity/Bảng DB
```

## 1. Xe máy

Xe máy không có bảng riêng tên `Motorcycle`. Xe máy là một bản ghi trong bảng `Products`, được phân biệt bằng:

```csharp
Product.Kind = 1 // ProductKind.Motorcycle
```

### File frontend admin

- `frontend-admin/src/pages/products/ProductList.jsx`
  - Trang danh sách "Quản lý xe máy".
  - Gọi API lấy danh sách xe máy, tìm kiếm, lọc, phân trang, sắp xếp.
  - Khi ở chế độ xe máy, truyền `loaiSanPham = "XeMay"` hoặc `kind = 1`.

- `frontend-admin/src/pages/products/ProductForm.jsx`
  - Form thêm/sửa xe máy.
  - Nhập mã xe, tên xe, danh mục, hãng xe, dòng xe, giá, mô tả, trạng thái, ảnh.
  - Khi lưu sẽ gọi `productService.create(...)` hoặc `productService.update(...)`.

- `frontend-admin/src/pages/products/VariantManager.jsx`
  - Quản lý SKU/biến thể của xe máy.
  - Ví dụ: phiên bản, màu sắc, giá niêm yết, giá khuyến mại, barcode.

- `frontend-admin/src/pages/products/ImageManager.jsx`
  - Quản lý ảnh sản phẩm.
  - Upload ảnh, chọn ảnh chính, xóa ảnh.

- `frontend-admin/src/pages/products/ProductBarcodeModal.jsx`
  - Xem/in barcode theo SKU.

- `frontend-admin/src/pages/products/ProductInventoryAgingModal.jsx`
  - Xem tuổi tồn kho của sản phẩm.

### File frontend service

- `frontend-admin/src/services/productService.js`
  - `getAll(params)` gọi `GET /products`.
  - `create(data)` gọi `POST /products`.
  - `update(id, data)` gọi `PUT /products/{id}`.
  - `delete(id)` gọi `DELETE /products/{id}`.
  - `getVariants(productId)` gọi `GET /products/{id}/skus`.
  - `createVariant(...)`, `updateVariant(...)`, `deleteVariant(...)` xử lý SKU.
  - `getImages(...)`, `uploadImage(...)`, `setPrimaryImage(...)`, `deleteImage(...)` xử lý ảnh.
  - File này cũng map tên trường tiếng Việt của UI sang DTO tiếng Anh của backend:
    - `maSanPhamKinhDoanh` -> `code`
    - `tenSanPham` -> `name`
    - `maDanhMuc` -> `categoryId`
    - `maHangXe` -> `brandId`
    - `maDongXe` -> `vehicleModelId`
    - `giaGoc` -> `listPrice`
    - `giaKhuyenMai` -> `salePrice`
    - `loaiSanPham = "XeMay"` -> `kind = 1`

### File frontend store

- `frontend-store/src/pages/ProductListPage.jsx`
  - Trang khách hàng xem danh sách sản phẩm.
  - Đọc query từ URL như `categoryId`, `brandId`, `carModelId`, `sortBy`, `minPrice`, `maxPrice`.
  - Gọi `productApi.getAll(...)`.

- `frontend-store/src/pages/ProductDetailPage.jsx`
  - Trang chi tiết xe máy.
  - Lấy chi tiết sản phẩm, ảnh, SKU, đánh giá, sản phẩm liên quan.

- `frontend-store/src/services/api.js`
  - Map query của store sang query backend:
    - `brandId` -> `BrandId`
    - `carModelId` -> `VehicleModelId`
    - `productType` -> `Kind`
    - `minPrice` -> `MinPrice`
    - `maxPrice` -> `MaxPrice`
    - `sortBy` -> `SortBy` và `SortDescending`

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/ProductsController.cs`
  - `GET /api/products`: lấy danh sách xe máy/phụ tùng.
  - `GET /api/products/filters`: lấy danh mục, hãng xe, dòng xe cho bộ lọc.
  - `GET /api/products/{id}`: lấy chi tiết sản phẩm.
  - `POST /api/products`: thêm sản phẩm.
  - `PUT /api/products/{id}`: sửa sản phẩm.
  - `DELETE /api/products/{id}`: xóa mềm sản phẩm.

- `backend/src/MoToSale.APIService/Controllers/ProductsController.Skus.cs`
  - `GET /api/products/{id}/skus`: lấy SKU.
  - `POST /api/products/{id}/skus`: thêm SKU.
  - `PUT /api/products/{id}/skus/{skuId}`: sửa SKU.
  - `DELETE /api/products/{id}/skus/{skuId}`: xóa SKU.

- `backend/src/MoToSale.APIService/Controllers/ProductsController.Images.cs`
  - `GET /api/products/{id}/images`: lấy ảnh.
  - `POST /api/products/{id}/images`: upload/thêm ảnh.
  - `POST /api/products/{id}/images/{imageId}/primary`: đặt ảnh chính.
  - `DELETE /api/products/{id}/images/{imageId}`: xóa ảnh.

- `backend/src/MoToSale.APIService/Controllers/ProductsController.RelatedExtras.cs`
  - Lấy khuyến mại liên quan sản phẩm.
  - Lấy sản phẩm liên quan.
  - Lấy tuổi tồn kho.
  - Lấy barcode.

### File backend service

- `backend/src/MoToSale.Services/Catalog/ICatalogService.cs`
  - Interface khai báo các hàm controller được phép gọi.

- `backend/src/MoToSale.Services/Catalog/CatalogService.ProductsManufacturers.cs`
  - `SearchProductsAsync(...)`: lấy danh sách, gắn tồn kho, gắn điểm đánh giá.
  - `GetProductAsync(id)`: lấy chi tiết sản phẩm, SKU, ảnh, tồn khả dụng.
  - `CreateProductAsync(...)`: thêm xe máy/phụ tùng.
  - `UpdateProductAsync(...)`: sửa thông tin sản phẩm và SKU mặc định.
  - `DeleteProductAsync(id)`: xóa mềm bằng `Status = Deleted`.

- `backend/src/MoToSale.Services/Catalog/CatalogService.LookupsSkusImages.cs`
  - Xử lý danh sách SKU, thêm/sửa/xóa SKU.
  - Xử lý ảnh sản phẩm.

- `backend/src/MoToSale.Services/Catalog/CatalogService.CompatibilityExtrasMapping.cs`
  - Map sản phẩm sang DTO trả về FE.
  - Xử lý tương thích phụ tùng, sản phẩm liên quan, barcode, tuổi tồn kho.

### File repository và database

- `backend/src/MoToSale.Repository/Catalog/ProductRepository.cs`
  - `SearchAsync(...)`: truy vấn danh sách sản phẩm.
  - `ApplyBasicFilters(...)`: lọc keyword, danh mục, hãng xe, dòng xe, loại sản phẩm.
  - `ApplyPriceFilters(...)`: lọc giá theo `SalePrice ?? ListPrice`.
  - `ApplyStockStatusFilter(...)`: lọc tồn kho.
  - `ApplyPromotionFilter(...)`: lọc sản phẩm có/không có khuyến mại.
  - `ApplySorting(...)`: sắp xếp theo mã, tên, danh mục, hãng, giá, tồn kho, trạng thái.

- `backend/src/MoToSale.Repository/Catalog/SkuRepository.cs`
  - Truy vấn SKU theo sản phẩm.

- `backend/src/MoToSale.Repository/Catalog/ProductImageRepository.cs`
  - Truy vấn ảnh sản phẩm.

- `backend/src/MoToSale.Repository/AppDbContext.cs`
  - Có `DbSet<Product> Products`.
  - Có `DbSet<Sku> Skus`.
  - Có `DbSet<ProductImage> ProductImages`.

- `backend/src/MoToSale.Repository/Configurations/CatalogConfiguration.cs`
  - Cấu hình bảng `Products`, `Skus`, `ProductImages`, quan hệ và index.

### Bảng database liên quan

- `Products`: thông tin xe máy/phụ tùng.
- `Skus`: biến thể, màu, phiên bản, giá.
- `ProductImages`: ảnh sản phẩm.
- `Brands`: hãng xe.
- `VehicleModels`: dòng xe.
- `Categories`: danh mục.
- `InventoryItems`: tồn kho theo SKU.
- `StockMovements`: lịch sử phát sinh kho.
- `Reviews`: đánh giá sản phẩm.
- `VoucherScopes`, `Vouchers`: khuyến mại áp dụng cho sản phẩm/danh mục/hãng.

### Luồng thêm xe máy

```text
ProductForm.jsx
-> productService.create(...)
-> POST /api/products
-> ProductsController.Create(...)
-> ICatalogService.CreateProductAsync(...)
-> CatalogService.CreateProductAsync(...)
-> ProductRepository.Add(...)
-> AppDbContext.SaveChangesAsync()
-> Products + Skus
```

Sau khi thêm xe, nếu có ảnh:

```text
ProductForm.jsx hoặc ImageManager.jsx
-> productService.uploadImage(...)
-> POST /api/products/{id}/images
-> ProductsController.Images.cs
-> IImageStorage.SaveAsync(...)
-> ICatalogService.AddImageAsync(...)
-> ProductImages
```

### Luồng sửa xe máy

```text
ProductForm.jsx
-> productService.update(id, data)
-> PUT /api/products/{id}
-> ProductsController.Update(...)
-> CatalogService.UpdateProductAsync(...)
-> ProductRepository.GetByIdAsync(...)
-> cập nhật Product
-> SkuRepository.GetByProductAsync(...)
-> cập nhật SKU mặc định
-> SaveChangesAsync()
```

### Luồng xem danh sách xe máy

```text
ProductList.jsx
-> productService.getAll({ loaiSanPham: "XeMay", ... })
-> GET /api/products?kind=1...
-> ProductsController.Search(...)
-> CatalogService.SearchProductsAsync(...)
-> ProductRepository.SearchAsync(...)
-> Products + Skus + Images + InventoryItems + Reviews
-> ProductListItem
-> ProductList.jsx hiển thị bảng
```

## 2. Phụ tùng

Phụ tùng cũng dùng bảng `Products`, được phân biệt bằng:

```csharp
Product.Kind = 2 // ProductKind.Part
```

Khác xe máy ở chỗ:

- Phụ tùng dùng `ManufacturerId` để chỉ hãng sản xuất phụ tùng.
- Phụ tùng có thể có tương thích với hãng xe/dòng xe qua bảng `PartCompatibilities`.
- Phụ tùng không dùng `BrandId` và `VehicleModelId` như xe máy.

### File frontend admin

- `frontend-admin/src/pages/products/ProductList.jsx`
  - Cùng file với xe máy nhưng cấu hình khác cho phụ tùng.
  - Khi ở chế độ phụ tùng, truyền `loaiSanPham = "PhuTung"` hoặc `kind = 2`.

- `frontend-admin/src/pages/products/ProductForm.jsx`
  - Form thêm/sửa phụ tùng.
  - Chọn danh mục phụ tùng, hãng sản xuất phụ tùng, giá, mô tả, ảnh.

- `frontend-admin/src/pages/products/CompatibilityManager.jsx`
  - Quản lý phụ tùng tương thích hãng xe/dòng xe nào.

- `frontend-admin/src/pages/products/VariantManager.jsx`
  - Quản lý SKU/biến thể phụ tùng.

- `frontend-admin/src/pages/products/ImageManager.jsx`
  - Quản lý ảnh phụ tùng.

### File frontend service

- `frontend-admin/src/services/productService.js`
  - Map `loaiSanPham = "PhuTung"` thành `kind = 2`.
  - Map `maHangSanXuat` thành `manufacturerId`.
  - Gọi chung API `/products`.

### File backend

- `backend/src/MoToSale.APIService/Controllers/ProductsController.cs`
  - API sản phẩm dùng chung cho xe máy và phụ tùng.

- `backend/src/MoToSale.APIService/Controllers/ProductsController.Compatibilities.cs`
  - `GET /api/products/{id}/compatibilities`
  - `POST /api/products/{id}/compatibilities`
  - `PUT /api/products/{id}/compatibilities/{compatId}`
  - `DELETE /api/products/{id}/compatibilities/{compatId}`

- `backend/src/MoToSale.Services/Catalog/CatalogService.ProductsManufacturers.cs`
  - Khi thêm/sửa:
    - Nếu là phụ tùng thì `BrandId = null`.
    - Nếu là phụ tùng thì `VehicleModelId = null`.
    - Nếu là phụ tùng thì lưu `ManufacturerId`.

- `backend/src/MoToSale.Services/Catalog/CatalogService.CompatibilityExtrasMapping.cs`
  - Xử lý tương thích phụ tùng với hãng/dòng xe.

- `backend/src/MoToSale.Repository/Catalog/ProductRepository.cs`
  - Lọc `Kind = 2`.
  - Có `ApplyVehicleCompatibilityFilter(...)` để lọc phụ tùng theo dòng xe tương thích.

### Bảng database liên quan

- `Products`: bản ghi phụ tùng.
- `Skus`: biến thể/giá phụ tùng.
- `ProductImages`: ảnh phụ tùng.
- `Manufacturers`: hãng sản xuất phụ tùng.
- `PartCompatibilities`: phụ tùng tương thích hãng xe/dòng xe nào.
- `Brands`, `VehicleModels`: dùng để khai báo tương thích.
- `InventoryItems`, `StockMovements`: tồn kho phụ tùng.

### Luồng thêm phụ tùng

```text
ProductForm.jsx
-> productService.create({ loaiSanPham: "PhuTung", maHangSanXuat, ... })
-> POST /api/products
-> ProductsController.Create(...)
-> CatalogService.CreateProductAsync(...)
-> Product.Kind = 2
-> Product.ManufacturerId = request.ManufacturerId
-> Product.BrandId = null
-> Product.VehicleModelId = null
-> Products + Skus
```

### Luồng thêm tương thích phụ tùng

```text
CompatibilityManager.jsx
-> productService.createCompatibility(productId, data)
-> POST /api/products/{id}/compatibilities
-> ProductsController.Compatibilities.cs
-> CatalogService
-> PartCompatibilities
```

## 3. Hãng xe

Hãng xe là dữ liệu trong bảng `Brands`. Ví dụ: Honda, Yamaha, Suzuki.

### File frontend admin

- `frontend-admin/src/pages/brands/BrandList.jsx`
  - Quản lý hãng xe.
  - Đồng thời có phần quản lý dòng xe.
  - Có tìm kiếm, lọc, sắp xếp, phân trang theo backend.
  - Có upload logo hãng xe.

### File frontend service

- `frontend-admin/src/services/brandService.js`
  - `getAll(params)` gọi `GET /brands`.
  - `create(data)` gọi `POST /brands`.
  - `update(id, data)` gọi `PUT /brands/{id}`.
  - `delete(id)` gọi `DELETE /brands/{id}`.
  - `uploadLogo(id, formData)` gọi `POST /brands/{id}/logo`.
  - `getAllModels(params)` gọi `GET /models`.
  - `createModel(...)`, `updateModel(...)`, `deleteModel(...)` quản lý dòng xe.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/CatalogLookupController.cs`
  - `GET /api/brands`: lấy danh sách hãng xe.
  - Đây là endpoint dùng cho dropdown/lookup và danh sách có phân trang.

- `backend/src/MoToSale.APIService/Controllers/BrandsController.cs`
  - `POST /api/brands`: thêm hãng xe.
  - `PUT /api/brands/{id}`: sửa hãng xe.
  - `DELETE /api/brands/{id}`: xóa mềm hãng xe.
  - `POST /api/brands/{id}/logo`: upload logo.

### File backend service

- `backend/src/MoToSale.Services/Catalog/ICatalogService.cs`
  - Khai báo các hàm hãng xe.

- `backend/src/MoToSale.Services/Catalog/CatalogService.BrandsModelsCategories.cs`
  - Tạo/sửa/xóa hãng xe.
  - Tạo/sửa/xóa dòng xe.
  - Tạo/sửa/xóa danh mục.

- `backend/src/MoToSale.Services/Catalog/CatalogService.BrandModelSearch.cs`
  - Tìm kiếm, lọc, sắp xếp, phân trang hãng xe và dòng xe.

### Bảng database liên quan

- `Brands`: hãng xe.
- `VehicleModels`: dòng xe thuộc hãng.
- `Products`: xe máy tham chiếu `BrandId`.

### Luồng danh sách hãng xe

```text
BrandList.jsx
-> brandService.getAll(params)
-> GET /api/brands
-> CatalogLookupController hoặc Brands-related endpoint
-> CatalogService.SearchBrandsAsync(...)
-> Brands
-> BrandList.jsx hiển thị bảng
```

### Luồng thêm/sửa/xóa hãng xe

```text
BrandList.jsx
-> brandService.create/update/delete
-> /api/brands
-> BrandsController
-> CatalogService.BrandsModelsCategories.cs
-> Brands
```

## 4. Dòng xe

Dòng xe là dữ liệu trong bảng `VehicleModels`. Ví dụ: Vision, Air Blade, Winner X.

### File frontend admin

- `frontend-admin/src/pages/brands/BrandList.jsx`
  - Phần quản lý dòng xe nằm cùng trang hãng xe.
  - Dòng xe luôn thuộc một hãng xe.

### File frontend service

- `frontend-admin/src/services/brandService.js`
  - `getAllModels(params)` gọi `GET /models`.
  - `createModel(data)` gọi `POST /models`.
  - `updateModel(id, data)` gọi `PUT /models/{id}`.
  - `deleteModel(id)` gọi `DELETE /models/{id}`.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/CatalogLookupController.cs`
  - `GET /api/models`: lấy danh sách dòng xe.

- `backend/src/MoToSale.APIService/Controllers/ModelsController.cs`
  - `POST /api/models`: thêm dòng xe.
  - `PUT /api/models/{id}`: sửa dòng xe.
  - `DELETE /api/models/{id}`: xóa mềm dòng xe.

### File backend service

- `backend/src/MoToSale.Services/Catalog/CatalogService.BrandsModelsCategories.cs`
  - Tạo/sửa/xóa dòng xe.

- `backend/src/MoToSale.Services/Catalog/CatalogService.BrandModelSearch.cs`
  - Tìm kiếm, lọc, sắp xếp, phân trang dòng xe.

### Bảng database liên quan

- `VehicleModels`: dòng xe.
- `Brands`: hãng xe cha.
- `Products`: xe máy tham chiếu `VehicleModelId`.
- `PartCompatibilities`: phụ tùng có thể tương thích với dòng xe.

### Luồng thêm dòng xe

```text
BrandList.jsx
-> brandService.createModel(...)
-> POST /api/models
-> ModelsController.Create(...)
-> CatalogService.CreateModelAsync(...)
-> VehicleModels
```

## 5. Hãng sản xuất phụ tùng

Hãng sản xuất phụ tùng là dữ liệu trong bảng `Manufacturers`. Ví dụ: Motul, Michelin, NGK.

### File frontend admin

- `frontend-admin/src/pages/manufacturers/ManufacturerList.jsx`
  - Trang quản lý hãng sản xuất phụ tùng.
  - Có tìm kiếm, lọc từng trường, sắp xếp từng trường, phân trang từ backend.
  - Có upload logo.

### File frontend service

- `frontend-admin/src/services/manufacturerService.js`
  - `getAll(params)` gọi `GET /manufacturers`.
  - `create(data)` gọi `POST /manufacturers`.
  - `update(id, data)` gọi `PUT /manufacturers/{id}`.
  - `delete(id)` gọi `DELETE /manufacturers/{id}`.
  - `uploadLogo(id, formData)` gọi `POST /manufacturers/{id}/logo`.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/ManufacturersController.cs`
  - `GET /api/manufacturers`: lấy danh sách hãng sản xuất phụ tùng.
  - `POST /api/manufacturers`: thêm.
  - `PUT /api/manufacturers/{id}`: sửa.
  - `POST /api/manufacturers/{id}/logo`: upload logo.
  - `DELETE /api/manufacturers/{id}`: xóa mềm.

### File backend service

- `backend/src/MoToSale.Services/Catalog/CatalogService.ProductsManufacturers.cs`
  - `GetManufacturersAsync(...)`.
  - `CreateManufacturerAsync(...)`.
  - `UpdateManufacturerAsync(...)`.
  - `SetManufacturerLogoAsync(...)`.
  - `DeleteManufacturerAsync(...)`.

- `backend/src/MoToSale.Services/Catalog/CatalogService.BrandModelSearch.cs`
  - Tìm kiếm/lọc/sắp xếp/phân trang hãng sản xuất phụ tùng.

### Bảng database liên quan

- `Manufacturers`: hãng sản xuất phụ tùng.
- `Products`: phụ tùng tham chiếu `ManufacturerId`.

### Luồng thêm hãng sản xuất phụ tùng

```text
ManufacturerList.jsx
-> manufacturerService.create(...)
-> POST /api/manufacturers
-> ManufacturersController.Create(...)
-> CatalogService.CreateManufacturerAsync(...)
-> Manufacturers
```

### Luồng gắn hãng sản xuất vào phụ tùng

```text
ProductForm.jsx
-> productService.create/update(...)
-> POST/PUT /api/products
-> CatalogService.CreateProductAsync/UpdateProductAsync
-> Product.Kind = 2
-> Product.ManufacturerId = selectedManufacturerId
-> Products
```

## 6. Đơn hàng

Đơn hàng dùng nhóm bảng `Orders`, `OrderLines`, `Allocations`, `OrderStatusHistories`, có liên hệ với thanh toán, tồn kho, voucher và người dùng.

### File frontend admin

- `frontend-admin/src/pages/orders/OrderList.jsx`
  - Danh sách đơn hàng admin.
  - Gọi backend để tìm kiếm, lọc, sắp xếp, phân trang.
  - Có export Excel.

- `frontend-admin/src/pages/orders/OrderDetail.jsx`
  - Chi tiết đơn hàng.
  - Cập nhật thông tin đơn, trạng thái đơn, trạng thái giao/xuất kho.
  - Hủy đơn.
  - Soạn hàng/xuất kho.

- `frontend-admin/src/pages/orders/PosOrder.jsx`
  - Tạo đơn bán tại quầy.
  - Chọn SKU từ tồn kho.
  - Chọn khách hàng.
  - Áp voucher.
  - Gọi API tạo đơn POS.

### File frontend store

- `frontend-store/src/pages/CheckoutPage.jsx`
  - Khách hàng đặt hàng từ giỏ.

- `frontend-store/src/pages/OrdersPage.jsx`
  - Khách xem danh sách đơn của mình.

- `frontend-store/src/pages/OrderDetailPage.jsx`
  - Khách xem chi tiết đơn.

- `frontend-store/src/services/api.js`
  - Có `orderApi` để checkout, lấy đơn của tôi, lấy chi tiết, hủy đơn, báo đã chuyển khoản.

### File frontend service admin

- `frontend-admin/src/services/orderService.js`
  - `getAll(params)` gọi `GET /orders`.
  - `getById(id)` gọi `GET /orders/{id}`.
  - `createPos(data)` gọi `POST /orders/pos`.
  - `update(id, data)` gọi `PUT /orders/{id}`.
  - `updateStatus(id, data)` gọi `PUT /orders/{id}/status`.
  - `updateFulfillmentStatus(id, data)` gọi `PUT /orders/{id}/fulfillment-status`.
  - `getAllocationSuggestion(id)` gọi `GET /orders/{id}/allocation-suggestion`.
  - `allocate(id, data)` gọi `POST /orders/{id}/allocate`.
  - `fulfill(id)` gọi `POST /orders/{id}/fulfill`.
  - `cancel(id, data)` gọi `POST /orders/{id}/cancel`.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/OrdersController.cs`
  - `POST /api/orders`: khách checkout.
  - `GET /api/orders/mine`: khách xem đơn của mình.
  - `GET /api/orders/{id}`: xem chi tiết đơn.
  - `POST /api/orders/{id}/cancel`: hủy đơn.
  - `POST /api/orders/{id}/payment-claim`: khách báo đã chuyển khoản.

- `backend/src/MoToSale.APIService/Controllers/OrdersController.Admin.cs`
  - `POST /api/orders/pos`: tạo đơn tại quầy.
  - `GET /api/orders`: admin/staff xem danh sách đơn.
  - `GET /api/orders/{id}/allocation-suggestion`: gợi ý xuất kho.
  - `POST /api/orders/{id}/allocate`: soạn hàng/xuất kho.
  - `PUT /api/orders/{id}`: sửa đơn.
  - `POST /api/orders/{id}/fulfill`: giao hàng và xuất kho.
  - `PUT /api/orders/{id}/status`: cập nhật trạng thái đơn.
  - `PUT /api/orders/{id}/fulfillment-status`: cập nhật trạng thái giao/xuất kho.

### File backend service

- `backend/src/MoToSale.Services/Ordering/IOrderService.cs`
  - Interface của đơn hàng.

- `backend/src/MoToSale.Services/Ordering/OrderService.cs`
  - Khởi tạo dependencies chính.

- `backend/src/MoToSale.Services/Ordering/OrderService.Checkout.cs`
  - Xử lý khách checkout từ giỏ hàng.

- `backend/src/MoToSale.Services/Ordering/OrderService.Pos.cs`
  - Xử lý tạo đơn tại quầy.

- `backend/src/MoToSale.Services/Ordering/OrderService.QueryAllocationFulfillment.cs`
  - Tìm kiếm đơn.
  - Lấy chi tiết đơn.
  - Gợi ý xuất kho.
  - Giao hàng/xuất kho.

- `backend/src/MoToSale.Services/Ordering/OrderService.AdminUpdate.cs`
  - Sửa đơn hàng từ admin.

- `backend/src/MoToSale.Services/Ordering/OrderService.StatusUpdates.cs`
  - Cập nhật trạng thái đơn.
  - Hủy đơn.
  - Cập nhật trạng thái giao/xuất kho.

- `backend/src/MoToSale.Services/Ordering/OrderService.Mapping.cs`
  - Map entity `Order` sang DTO trả về FE.

### File repository và database

- `backend/src/MoToSale.Repository/Ordering/OrderRepository.cs`
  - Truy vấn đơn hàng.

- `backend/src/MoToSale.Repository/Ordering/CartRepository.cs`
  - Truy vấn giỏ hàng khi checkout.

- `backend/src/MoToSale.Repository/Inventory/InventoryRepository.cs`
  - Dùng khi giữ hàng, xuất hàng, kiểm tra tồn.

- `backend/src/MoToSale.Repository/Configurations/OrderingConfiguration.cs`
  - Cấu hình bảng đơn hàng.

### Bảng database liên quan

- `Orders`: thông tin đơn hàng.
- `OrderLines`: dòng sản phẩm trong đơn.
- `Allocations`: phân bổ/xuất kho cho đơn.
- `OrderStatusHistories`: lịch sử trạng thái đơn.
- `Payments`: giao dịch thanh toán.
- `Vouchers`: voucher đã áp dụng.
- `InventoryItems`: tồn kho.
- `StockMovements`: phát sinh kho.
- `Reservations`: giữ hàng.
- `Users`: khách hàng đặt đơn.

### Luồng khách checkout

```text
CheckoutPage.jsx
-> orderApi.create(...)
-> POST /api/orders
-> OrdersController.Checkout(...)
-> OrderService.CheckoutAsync(...)
-> CartRepository
-> Product/Sku/Inventory/Voucher
-> Orders + OrderLines + Payments/Reservations
```

### Luồng admin xem danh sách đơn

```text
OrderList.jsx
-> orderService.getAll(params)
-> GET /api/orders
-> OrdersController.Admin.Search(...)
-> OrderService.SearchOrdersAsync(...)
-> OrderRepository
-> Orders + OrderLines + Payments
-> OrderList.jsx
```

### Luồng cập nhật đơn hàng

```text
OrderDetail.jsx
-> orderService.update(id, payload)
-> PUT /api/orders/{id}
-> OrdersController.Admin.Update(...)
-> OrderService.UpdateOrderAsync(...)
-> Orders + OrderLines
-> AuditLogs
```

### Luồng cập nhật trạng thái đơn

```text
OrderDetail.jsx
-> orderService.updateStatus(id, { toStatus, note })
-> PUT /api/orders/{id}/status
-> OrdersController.Admin.UpdateStatus(...)
-> OrderService.UpdateStatusAsync(...)
-> Orders.Status
-> OrderStatusHistories
-> AuditLogs
```

### Luồng giao hàng/xuất kho

```text
OrderDetail.jsx
-> orderService.fulfill(id) hoặc orderService.allocate(id, data)
-> POST /api/orders/{id}/fulfill hoặc /allocate
-> OrdersController.Admin.cs
-> OrderService
-> InventoryService/InventoryRepository
-> InventoryItems + StockMovements + Allocations
-> Orders.FulfillmentStatus
```

## 7. Voucher

Voucher dùng bảng `Vouchers` và bảng phạm vi áp dụng `VoucherScopes`.

### File frontend admin

- `frontend-admin/src/pages/vouchers/VoucherList.jsx`
  - Danh sách voucher.
  - Tạo/sửa/xóa voucher.
  - Chọn phạm vi áp dụng: toàn bộ, sản phẩm, danh mục, hãng.
  - Gọi thêm product/category/brand service để lấy dữ liệu chọn scope.

### File frontend store

- `frontend-store/src/pages/VouchersPage.jsx`
  - Trang khách hàng xem voucher đang có.

- `frontend-store/src/pages/CheckoutPage.jsx`
  - Khách nhập/chọn voucher khi đặt hàng.

### File frontend service

- `frontend-admin/src/services/voucherService.js`
  - `getAll(params)` gọi `GET /vouchers`.
  - `getAvailable()` gọi `GET /vouchers/available`.
  - `create(data)` gọi `POST /vouchers`.
  - `update(id, data)` gọi `PUT /vouchers/{id}`.
  - `delete(id)` gọi `DELETE /vouchers/{id}`.
  - `validate(code, subtotal)` gọi `POST /vouchers/validate`.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/VouchersController.cs`
  - `GET /api/vouchers`: admin/staff tìm kiếm voucher.
  - `GET /api/vouchers/available`: khách lấy voucher khả dụng.
  - `GET /api/vouchers/{id}`: chi tiết voucher.
  - `POST /api/vouchers`: tạo voucher.
  - `PUT /api/vouchers/{id}`: sửa voucher.
  - `DELETE /api/vouchers/{id}`: xóa voucher nếu chưa dùng.
  - `POST /api/vouchers/validate`: kiểm tra voucher có dùng được không.

### File backend service

- `backend/src/MoToSale.Services/Ordering/IVoucherService.cs`
  - Interface voucher.

- `backend/src/MoToSale.Services/Ordering/VoucherService.cs`
  - Tìm kiếm voucher.
  - Lấy chi tiết voucher.
  - Tạo/sửa/xóa voucher.
  - Validate dữ liệu voucher.
  - Ghi scope áp dụng voucher.

- `backend/src/MoToSale.Services/Ordering/VoucherService.Storefront.cs`
  - Lấy voucher khả dụng cho storefront.
  - Validate voucher khi khách dùng.

### File repository và database

- `backend/src/MoToSale.Repository/Ordering/VoucherRepository.cs`
  - Tìm kiếm voucher.
  - Kiểm tra mã trùng.
  - Lấy scope.
  - Thay thế scope.

- `backend/src/MoToSale.Repository/Configurations/OrderingConfiguration.cs`
  - Cấu hình bảng `Vouchers` và `VoucherScopes`.

### Bảng database liên quan

- `Vouchers`: thông tin voucher.
- `VoucherScopes`: voucher áp dụng cho toàn bộ/sản phẩm/danh mục/hãng.
- `Orders`: đơn hàng có thể lưu voucher đã áp dụng.
- `Products`, `Categories`, `Brands`: đối tượng được voucher áp dụng.

### Luồng tạo voucher

```text
VoucherList.jsx
-> voucherService.create(payload)
-> POST /api/vouchers
-> VouchersController.Create(...)
-> VoucherService.CreateAsync(...)
-> VoucherRepository.CodeExistsAsync(...)
-> Vouchers
-> VoucherRepository.ReplaceScopesAsync(...)
-> VoucherScopes
```

### Luồng dùng voucher khi đặt hàng

```text
CheckoutPage.jsx hoặc PosOrder.jsx
-> voucherService.validate(code, subtotal)
-> POST /api/vouchers/validate
-> VouchersController.Validate(...)
-> VoucherService.ValidateAsync(...)
-> Vouchers + VoucherScopes
-> trả discount
-> OrderService.CheckoutAsync/CreatePosOrderAsync lưu đơn
```

## 8. Khách hàng

Khách hàng nằm trong bảng `Users`, phân biệt theo role/trạng thái và các trường thông tin người dùng. Địa chỉ khách hàng nằm trong bảng `Addresses`.

### File frontend admin

- `frontend-admin/src/pages/customers/CustomerList.jsx`
  - Trang quản lý khách hàng.
  - Có tìm kiếm, lọc từng trường, sắp xếp từng trường, reload, phân trang từ backend.
  - Tạo/sửa khách hàng.
  - Xem hồ sơ khách hàng.
  - Cập nhật ghi chú chăm sóc khách hàng.

- `frontend-admin/src/pages/users/UserList.jsx`
  - Trang quản lý tài khoản nội bộ/admin/staff.
  - Không phải trang khách hàng chính, nhưng dùng chung API users.

### File frontend store

- `frontend-store/src/components/AuthForm.jsx`
  - Đăng ký/đăng nhập khách hàng.

- `frontend-store/src/pages/AccountPage.jsx`
  - Khách cập nhật hồ sơ, địa chỉ.

### File frontend service

- `frontend-admin/src/services/userService.js`
  - `getCustomers(params)` gọi `GET /users/customers`.
  - `getCustomerProfile(id)` gọi `GET /customers/{id}/profile`.
  - `createCustomer(data)` gọi `POST /users/customers`.
  - `updateCustomer(id, data)` gọi `PUT /users/customers/{id}`.
  - `updateCustomerCareNote(id, data)` gọi `PATCH /users/customers/{id}/care-note`.
  - `getAll(...)`, `create(...)`, `update(...)`, `updateStatus(...)`, `delete(...)` dùng cho tài khoản nội bộ.

- `frontend-store/src/services/api.js`
  - Có `authApi`, `userApi`, `addressApi` cho khách hàng tự quản lý hồ sơ.

### File backend controller

- `backend/src/MoToSale.AuthService/Controllers/UsersController.cs`
  - `GET /api/users/me`: lấy hồ sơ hiện tại.
  - `PUT /api/users/me`: cập nhật hồ sơ cá nhân.
  - `PUT /api/users/me/password`: đổi mật khẩu.
  - `GET /api/users/me/addresses`: lấy địa chỉ.
  - `POST /api/users/me/addresses`: thêm địa chỉ.
  - `PUT /api/users/me/addresses/{id}`: sửa địa chỉ.
  - `PUT /api/users/me/addresses/{id}/default`: đặt địa chỉ mặc định.
  - `DELETE /api/users/me/addresses/{id}`: xóa địa chỉ.
  - `GET /api/users/customers`: admin/staff xem danh sách khách hàng.
  - `POST /api/users/customers`: tạo khách hàng.
  - `PUT /api/users/customers/{id}`: sửa khách hàng.
  - `PATCH /api/users/customers/{id}/care-note`: cập nhật ghi chú chăm sóc.
  - `GET /api/users/all`: admin xem tất cả user.
  - `POST /api/users`: admin tạo tài khoản nội bộ.
  - `PUT /api/users/{id}`: admin sửa tài khoản.
  - `PATCH /api/users/{id}/status`: admin đổi trạng thái.
  - `DELETE /api/users/{id}`: khóa tài khoản.

- `backend/src/MoToSale.APIService/Controllers/CustomersController.cs`
  - `GET /api/customers/{id}/profile`: lấy hồ sơ tổng hợp khách hàng.

### File backend service

- `backend/src/MoToSale.Services/Identity/IUserManagementService.cs`
  - Interface quản lý user/khách hàng.

- `backend/src/MoToSale.Services/Identity/UserManagementService.Customers.cs`
  - Tìm kiếm/lọc/sắp xếp/phân trang khách hàng.
  - Tạo/sửa khách hàng.
  - Cập nhật ghi chú chăm sóc.

- `backend/src/MoToSale.Services/Identity/UserManagementService.AdminUsers.cs`
  - Quản lý tài khoản nội bộ.

- `backend/src/MoToSale.Services/Identity/UserManagementService.ProfileAddresses.cs`
  - Cập nhật hồ sơ cá nhân và địa chỉ.

- `backend/src/MoToSale.Services/Customers/CustomerProfileService.cs`
  - Lấy hồ sơ khách hàng tổng hợp.
  - Có thể gồm thông tin user, đơn hàng, bảo hành, công nợ/dữ liệu liên quan tùy DTO.

### File repository và database

- `backend/src/MoToSale.Repository/Identity/UserRepository.cs`
  - Truy vấn user.

- `backend/src/MoToSale.Repository/Configurations/IdentityConfiguration.cs`
  - Cấu hình bảng user/role/address.

### Bảng database liên quan

- `Users`: tài khoản/khách hàng.
- `Roles`: vai trò.
- `UserRoles`: user thuộc role nào.
- `Addresses`: địa chỉ khách hàng.
- `Orders`: đơn hàng của khách.
- `Warranties`: bảo hành liên quan khách.
- `CustomerInteractions`: tương tác/chăm sóc khách hàng nếu có dùng.

### Luồng xem danh sách khách hàng

```text
CustomerList.jsx
-> userService.getCustomers(params)
-> GET /api/users/customers
-> UsersController.Customers(...)
-> UserManagementService.SearchCustomersAsync(...)
-> UserRepository/AppDbContext
-> Users + UserRoles + Orders liên quan nếu service cần thống kê
-> CustomerList.jsx
```

### Luồng tạo khách hàng từ admin

```text
CustomerList.jsx
-> userService.createCustomer(payload)
-> POST /api/users/customers
-> UsersController.CreateCustomer(...)
-> UserManagementService.CreateCustomerAsync(...)
-> Users + UserRoles
```

### Luồng khách tự cập nhật hồ sơ

```text
AccountPage.jsx
-> userApi.updateProfile(...)
-> PUT /api/users/me
-> UsersController.UpdateProfile(...)
-> UserManagementService.UpdateProfileAsync(...)
-> Users
```

## 9. Tồn kho

Tồn kho theo SKU. Sản phẩm không lưu tồn trực tiếp trong `Products`, mà tồn nằm ở `InventoryItems` và lịch sử phát sinh nằm ở `StockMovements`.

### File frontend admin

- `frontend-admin/src/pages/inventory/InventoryView.jsx`
  - Trang xem tồn kho hiện tại.
  - Xem tồn thực tế, đang giữ, khả dụng, ngưỡng thấp.
  - Điều chỉnh tồn.
  - Cập nhật ngưỡng cảnh báo.
  - Đồng bộ tồn.

- `frontend-admin/src/pages/inventory/StockDocumentList.jsx`
  - Trang chứng từ kho.
  - Tìm kiếm, lọc, sắp xếp, phân trang từ backend.
  - Tạo phiếu kho.
  - Duyệt phiếu.
  - Hủy phiếu.
  - Xem chi tiết phiếu.
  - Export Excel.

### File frontend service

- `frontend-admin/src/services/inventoryService.js`
  - `getAll(params)` gọi `GET /inventory`.
  - `sync()` gọi `POST /inventory/sync`.
  - `getHolds()` gọi `GET /inventory/holds`.
  - `getAdjustments()` gọi `GET /inventory/adjustments`.
  - `getDocumentList(params)` gọi `GET /inventory/document-list`.
  - `getDocuments(params)` gọi `GET /inventory/documents`.
  - `getDocumentById(id)` gọi `GET /inventory/documents/{id}`.
  - `getGoodsReceipts(...)` gọi `GET /inventory/goods-receipts`.
  - `createDocument(payload)` gọi `POST /inventory/documents`.
  - `approveDocument(id)` gọi `POST /inventory/documents/{id}/approve`.
  - `cancelDocument(id, payload)` gọi `POST /inventory/documents/{id}/cancel`.
  - `updateThreshold(payload)` gọi `PUT /inventory/threshold`.
  - `adjustStock(payload)` gọi `POST /inventory/adjust`.
  - `exportCsv(params)` gọi `GET /inventory/export`.

### File backend controller

- `backend/src/MoToSale.APIService/Controllers/InventoryController.cs`
  - `GET /api/inventory`: lấy tồn kho.
  - `GET /api/inventory/movements`: lấy lịch sử phát sinh kho.
  - `GET /api/inventory/documents`: lấy phiếu kho kiểu cũ.
  - `GET /api/inventory/document-list`: lấy danh sách chứng từ kho có search/filter/sort/paging.
  - `GET /api/inventory/documents/{id}`: chi tiết phiếu kho.
  - `GET /api/inventory/goods-receipts`: danh sách phiếu nhập.
  - `GET /api/inventory/goods-receipts/{id}`: chi tiết phiếu nhập.
  - `POST /api/inventory/documents`: tạo phiếu kho.
  - `POST /api/inventory/documents/{id}/approve`: duyệt phiếu, phát sinh tồn.
  - `POST /api/inventory/documents/{id}/cancel`: hủy phiếu.
  - `GET /api/inventory/holds`: hàng đang giữ.
  - `GET /api/inventory/adjustments`: lịch sử điều chỉnh.
  - `POST /api/inventory/adjust`: điều chỉnh tồn nhanh.
  - `PUT /api/inventory/threshold`: cập nhật ngưỡng thấp.
  - `POST /api/inventory/sync`: đồng bộ tồn theo sổ kho.
  - `GET /api/inventory/export`: xuất Excel tồn kho.

### File backend service

- `backend/src/MoToSale.Services/Inventory/IInventoryService.cs`
  - Interface tồn kho.

- `backend/src/MoToSale.Services/Inventory/InventoryService.cs`
  - Khởi tạo service và dependencies.

- `backend/src/MoToSale.Services/Inventory/InventoryService.Queries.cs`
  - Lấy tồn kho.
  - Lấy movement.
  - Lấy hàng giữ.
  - Cập nhật ngưỡng.
  - Sync tồn.
  - Export.

- `backend/src/MoToSale.Services/Inventory/InventoryService.StockDocumentList.cs`
  - Danh sách chứng từ kho có tìm kiếm/lọc/sắp xếp/phân trang.

- `backend/src/MoToSale.Services/Inventory/InventoryService.StockDocuments.cs`
  - Tạo phiếu kho.
  - Duyệt phiếu kho.
  - Hủy phiếu kho.
  - Khi duyệt sẽ ghi `StockMovements` và cập nhật `InventoryItems`.

- `backend/src/MoToSale.Services/Inventory/InventoryService.Adjustments.cs`
  - Điều chỉnh tồn nhanh.

- `backend/src/MoToSale.Services/Inventory/InventoryService.GoodsReceipts.cs`
  - Luồng phiếu nhập hàng.

### File repository và database

- `backend/src/MoToSale.Repository/Inventory/InventoryRepository.cs`
  - Truy vấn/cập nhật tồn kho.

- `backend/src/MoToSale.Repository/Inventory/StockDocumentRepository.cs`
  - Truy vấn phiếu kho.

- `backend/src/MoToSale.Repository/Inventory/ReservationRepository.cs`
  - Truy vấn giữ hàng.

- `backend/src/MoToSale.Repository/Configurations/InventoryConfiguration.cs`
  - Cấu hình bảng kho.

### Bảng database liên quan

- `InventoryItems`: tồn hiện tại theo SKU.
  - `OnHand`: tồn thực tế.
  - `Reserved`: số lượng đang giữ.
  - `ReorderPoint`: ngưỡng cảnh báo thấp.

- `StockMovements`: sổ kho phát sinh.
  - Chỉ được ghi thêm, không được sửa/xóa.
  - Có kiểm tra trong `AppDbContext.EnsureAppendOnlyStockLedger()`.

- `StockDocuments`: phiếu kho.
- `StockDocumentLines`: dòng sản phẩm trong phiếu kho.
- `Reservations`: giữ hàng cho đơn.
- `Skus`: SKU được quản lý tồn.
- `Products`: sản phẩm chứa SKU.

### Luồng xem tồn kho

```text
InventoryView.jsx
-> inventoryService.getAll(params)
-> GET /api/inventory
-> InventoryController.GetInventory(...)
-> InventoryService.GetInventoryAsync(...)
-> InventoryRepository/AppDbContext
-> InventoryItems + Skus + Products
-> InventoryView.jsx
```

### Luồng tạo phiếu kho

```text
StockDocumentList.jsx
-> inventoryService.createDocument(payload)
-> POST /api/inventory/documents
-> InventoryController.CreateDocument(...)
-> InventoryService.CreateDocumentAsync(...)
-> StockDocuments + StockDocumentLines
```

### Luồng duyệt phiếu kho

```text
StockDocumentList.jsx
-> inventoryService.approveDocument(id)
-> POST /api/inventory/documents/{id}/approve
-> InventoryController.Approve(...)
-> InventoryService.ApproveDocumentAsync(...)
-> đọc StockDocuments + StockDocumentLines
-> ghi StockMovements
-> cập nhật InventoryItems
-> AuditLogs
```

### Luồng điều chỉnh tồn nhanh

```text
InventoryView.jsx
-> inventoryService.adjustStock(payload)
-> POST /api/inventory/adjust
-> InventoryController.Adjust(...)
-> InventoryService.AdjustStockAsync(...)
-> StockMovements
-> InventoryItems
-> AuditLogs
```

## 10. Tổng hợp các bảng chính theo nhóm

| Nhóm | Bảng chính | Bảng liên quan |
| --- | --- | --- |
| Xe máy | `Products` với `Kind = 1` | `Skus`, `ProductImages`, `Brands`, `VehicleModels`, `Categories`, `InventoryItems` |
| Phụ tùng | `Products` với `Kind = 2` | `Skus`, `ProductImages`, `Manufacturers`, `PartCompatibilities`, `InventoryItems` |
| Hãng xe | `Brands` | `VehicleModels`, `Products` |
| Dòng xe | `VehicleModels` | `Brands`, `Products`, `PartCompatibilities` |
| Hãng sản xuất phụ tùng | `Manufacturers` | `Products` |
| Đơn hàng | `Orders` | `OrderLines`, `Allocations`, `OrderStatusHistories`, `Payments`, `Vouchers`, `InventoryItems`, `StockMovements` |
| Voucher | `Vouchers` | `VoucherScopes`, `Orders`, `Products`, `Categories`, `Brands` |
| Khách hàng | `Users` | `Roles`, `UserRoles`, `Addresses`, `Orders`, `Warranties`, `CustomerInteractions` |
| Tồn kho | `InventoryItems` | `StockMovements`, `StockDocuments`, `StockDocumentLines`, `Reservations`, `Skus`, `Products` |

## 11. Ghi nhớ nhanh khi lần code

Nếu muốn lần một chức năng từ giao diện xuống database, đi theo thứ tự:

```text
1. Tìm page trong frontend-admin/src/pages hoặc frontend-store/src/pages
2. Xem page đó import service nào trong frontend-admin/src/services hoặc frontend-store/src/services/api.js
3. Xem service gọi URL nào
4. Tìm controller backend có route URL đó
5. Xem controller gọi interface service nào
6. Xem implementation service xử lý nghiệp vụ
7. Xem repository hoặc AppDbContext truy vấn bảng nào
8. Xem entity trong backend/src/MoToSale.Entities
9. Xem cấu hình bảng trong backend/src/MoToSale.Repository/Configurations
```

Ví dụ với xe máy:

```text
ProductList.jsx
-> productService.js
-> GET /api/products
-> ProductsController.cs
-> ICatalogService
-> CatalogService.ProductsManufacturers.cs
-> ProductRepository.cs
-> Product.cs / Sku.cs / ProductImage.cs
-> CatalogConfiguration.cs
-> Products / Skus / ProductImages
```
