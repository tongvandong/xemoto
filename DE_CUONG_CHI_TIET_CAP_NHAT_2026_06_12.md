# Đề cương chi tiết cập nhật 12/06/2026 - MoToSale v2

## I. Phạm vi cần nắm

Bạn phụ trách chính:

- **Frontend Admin**: React/Vite, route admin, layout, page quản trị, service JS gọi API.
- **Backend**: .NET 8, API Gateway, AuthService, APIService, Controller, Service, Repository, Entity, DTO, DbContext, Migration.

Không cần học sâu `frontend-store`, nhưng cần biết:

- `frontend-store` là trang khách mua hàng.
- `frontend-admin` là trang quản trị.
- Cả hai đều dùng backend API.
- Một số module admin như banner, FAQ, bài viết là để quản trị nội dung hiển thị ngoài storefront.

Trạng thái project hiện tại:

```text
v2
-> backend
   -> MoToSale.ApiGateway
   -> MoToSale.AuthService
   -> MoToSale.APIService
   -> MoToSale.Services
   -> MoToSale.Repository
   -> MoToSale.Entities
   -> MoToSale.DTO
   -> MoToSale.Common
-> frontend-admin
-> frontend-store
```

Thay đổi mới cần nhớ:

```text
HomeBannerList hiện không cho nhập URL ảnh thủ công nữa.
Admin phải chọn ảnh từ máy tính.
Ảnh được upload qua API, backend lưu vào wwwroot/uploads/banners,
rồi trả URL tương đối /uploads/banners/<file>.
```

## II. Luồng tổng quát bắt buộc thuộc

Mọi chức năng admin đều đi theo công thức:

```text
Admin Page JSX
-> service JS
-> api.js / axios
-> API Gateway
-> Controller
-> Service
-> Repository / AppDbContext
-> Entity / SQL Server
-> DTO/Response
-> setState
-> render UI
```

Khi giảng viên hỏi bất kỳ chức năng nào, trả lời theo 9 bước:

```text
1. Trang admin nào xử lý?
2. Trang đó giữ state/form gì?
3. Trang gọi service JS nào?
4. Service gọi endpoint nào?
5. Controller nào nhận request?
6. Controller gọi service backend nào?
7. Service xử lý nghiệp vụ gì?
8. Dữ liệu đọc/ghi bảng nào?
9. Frontend nhận response và render lại ra sao?
```

Câu trả lời học thuộc:

```text
Em phụ trách Backend và Frontend Admin. Luồng chung là page React quản lý giao diện, state và sự kiện, sau đó gọi service JS. Service dùng api.js để gửi request, api.js tự gắn JWT vào header Authorization. Request đi qua API Gateway rồi xuống Controller. Controller kiểm tra quyền và gọi Service. Service xử lý nghiệp vụ, gọi Repository hoặc AppDbContext để đọc ghi SQL Server. Kết quả trả về frontend để setState và render.
```

## III. Bản đồ Frontend Admin hiện tại

### 1. Khởi động, route, layout

| File | Vai trò |
|---|---|
| `frontend-admin/src/main.jsx` | Entry React |
| `frontend-admin/src/App.jsx` | Khai báo route, lazy load page, bọc `AuthProvider` |
| `frontend-admin/src/contexts/AuthContext.jsx` | Quản lý user/token/role |
| `frontend-admin/src/components/ProtectedRoute.jsx` | Chặn route chưa login hoặc sai role |
| `frontend-admin/src/components/MainLayout.jsx` | Layout chính sau login |
| `frontend-admin/src/components/Sidebar.jsx` | Menu admin theo nhóm nghiệp vụ |
| `frontend-admin/src/components/Navbar.jsx` | Thanh trên cùng, user/logout |
| `frontend-admin/src/services/api.js` | Axios instance, gắn JWT, xử lý 401 |

Điểm mới trong `App.jsx`:

- Route được lazy load bằng `React.lazy`.
- Có `Suspense` và `RouteFallback`.
- `/products` redirect sang `/motorcycles`.
- Xe máy và phụ tùng dùng chung `ProductList` nhưng truyền `productType`.
- Một số route chỉ Admin:
  - `/users`
  - `/audit-logs`
  - `/finance`
  - `/operational-imports`

### 2. Nhóm route admin

| Nhóm | Route | Page |
|---|---|---|
| Dashboard | `/` | `Dashboard.jsx` |
| Catalog | `/motorcycles`, `/parts`, `/categories`, `/brands`, `/manufacturers` | Product/Category/Brand/Manufacturer |
| Bán hàng | `/orders`, `/orders/:id`, `/pos`, `/vouchers`, `/customers` | Orders/POS/Voucher/Customer |
| Kho & cung ứng | `/inventory`, `/stock-documents`, `/supply`, `/installments` | Inventory/Stock/Purchase/Installment |
| Hậu mãi | `/returns`, `/warranties`, `/service-crm` | Returns/Warranty/Service CRM |
| Nội dung | `/home-banners`, `/faq`, `/contacts`, `/reviews`, `/posts` | Content admin |
| Tài chính & hệ thống | `/finance`, `/reports`, `/users`, `/audit-logs`, `/settings`, `/operational-imports` | Finance/Reports/System |

## IV. Bản đồ Backend hiện tại

### 1. Các project backend

| Project | Vai trò |
|---|---|
| `MoToSale.ApiGateway` | Gateway Ocelot, nhận `/api/*` và chuyển xuống service |
| `MoToSale.AuthService` | Login/register/users/me, tạo JWT |
| `MoToSale.APIService` | API nghiệp vụ chính: catalog, order, inventory, content, operations |
| `MoToSale.Services` | Xử lý nghiệp vụ |
| `MoToSale.Repository` | EF Core DbContext, repository, migration, seed |
| `MoToSale.Entities` | Entity tương ứng bảng DB |
| `MoToSale.DTO` | Request/response DTO |
| `MoToSale.Common` | Constant, enum, auth helper, password hasher |

### 2. `Program.cs` của APIService cần nhớ

APIService đăng ký:

- `AddDbContext<AppDbContext>` dùng SQL Server.
- Repository:
  - `IRepository<>`
  - `IUnitOfWork`
  - `IProductRepository`
  - `IInventoryRepository`
  - `IOrderRepository`
  - `IVoucherRepository`
  - `IPaymentRepository`
- Service:
  - `ICatalogService`
  - `IInventoryService`
  - `IOrderService`
  - `IVoucherService`
  - `IContentService`
  - `IReviewService`
  - `IWarrantyService`
  - `IPaymentService`
  - `IAdvancedOperationsService`
  - `IBusinessOperationsService`
  - `IInstallmentService`
  - `IAuditLogService`
  - `IReportService`

APIService còn:

```text
db.Database.MigrateAsync()
```

Ý nghĩa:

```text
Khi APIService chạy, EF Core tự kiểm tra bảng __EFMigrationsHistory và áp các migration còn thiếu. Vì vậy nếu schema thay đổi thì phải tạo migration mới; app sẽ áp migration đó khi chạy nếu DB chưa có.
```

APIService cũng có:

```text
app.UseStaticFiles()
```

Ý nghĩa:

```text
Backend phục vụ file tĩnh trong wwwroot, trong đó có ảnh upload ở /uploads/...
Ví dụ banner upload xong trả về /uploads/banners/<file>.
```

### 3. `AppDbContext` cần nắm

`AppDbContext` khai báo nhiều nhóm bảng:

| Nhóm | DbSet chính |
|---|---|
| Identity | `Users`, `Roles`, `UserRoles`, `Addresses` |
| Catalog | `Brands`, `Manufacturers`, `VehicleModels`, `Categories`, `Products`, `Skus`, `ProductImages`, `PartCompatibilities` |
| Inventory | `InventoryItems`, `StockMovements`, `StockDocuments`, `Reservations` |
| Ordering | `Carts`, `Orders`, `OrderLines`, `Allocations`, `OrderStatusHistories`, `Vouchers` |
| Payments | `Payments` |
| Content | `Posts`, `Faqs`, `ContactRequests`, `HomeBanners` |
| Customer care | `Reviews`, `Favorites`, `Warranties`, `WarrantyHistories` |
| Operations | `SalesReturns`, `Refunds`, `InstallmentApplications`, `Suppliers`, `PurchaseOrders`, `GoodsReceipts`, `RepairOrders`, `CustomerInteractions`, `StaffAttendances` |
| System | `Settings`, `AuditLogs` |

Điểm mới quan trọng:

```text
AppDbContext override SaveChanges/SaveChangesAsync.
Trước khi lưu, nó PrepareSaveChanges:
- cập nhật CreatedDate/UpdatedDate;
- capture audit log cho thay đổi entity.
```

## V. Kiến trúc partial controller/service

Project hiện tại đã tách nhiều file bằng `partial class`.

Ví dụ:

```text
ProductsController.cs
ProductsController.Images.cs
ProductsController.Skus.cs
ProductsController.Compatibilities.cs
ProductsController.RelatedExtras.cs
```

```text
OrderService.cs
OrderService.Cart.cs
OrderService.Checkout.cs
OrderService.Pos.cs
OrderService.QueryAllocationFulfillment.cs
OrderService.StatusUpdates.cs
OrderService.AdminUpdate.cs
OrderService.Mapping.cs
```

```text
InventoryService.cs
InventoryService.Queries.cs
InventoryService.Adjustments.cs
InventoryService.StockDocuments.cs
InventoryService.GoodsReceipts.cs
```

```text
ContentController.cs
ContentController.Banners.cs
ContentController.Faqs.cs
ContentController.Posts.cs
ContentController.Contacts.cs
```

```text
ContentService.cs
ContentService.Banners.cs
ContentService.Faqs.cs
ContentService.Posts.cs
ContentService.Contacts.cs
```

Câu trả lời học thuộc:

```text
Partial class giúp tách một controller/service lớn thành nhiều file nhỏ theo nghiệp vụ nhưng khi biên dịch vẫn là một class. Ví dụ ProductsController vẫn cùng route /api/products, nhưng phần ảnh, SKU, tương thích và sản phẩm liên quan được tách ra file riêng để dễ đọc và dễ bảo trì.
```

## VI. Module Auth và phân quyền

### 1. Frontend

File cần nắm:

- `Login.jsx`
- `AuthContext.jsx`
- `ProtectedRoute.jsx`
- `authService.js`
- `api.js`

Luồng:

```text
Login.jsx
-> AuthContext.login(email, password)
-> authService.login()
-> POST /api/auth/login
-> API Gateway
-> AuthController.Login
-> AuthService.LoginAsync
-> kiểm tra email/password
-> tạo JWT
-> frontend lưu admin_token/admin_user
-> ProtectedRoute cho vào admin
```

Điểm cần nói:

- Token lưu ở `localStorage` key `admin_token`.
- User lưu ở `localStorage` key `admin_user`.
- `api.js` tự gắn:

```text
Authorization: Bearer <token>
```

- Nếu backend trả `401`, frontend xoá token/user và chuyển về `/login`.

### 2. Backend

File cần nắm:

- `MoToSale.AuthService/Controllers/AuthController.cs`
- `MoToSale.AuthService/Controllers/UsersController.cs`
- `MoToSale.Services/Identity/AuthService.cs`
- `MoToSale.Services/Identity/AuthService.Profile.cs`
- `MoToSale.Services/Identity/AuthService.PasswordReset.cs`
- `MoToSale.Common/Auth/TokenHelper.cs`
- `MoToSale.Common/PasswordHasher.cs`

Câu trả lời học thuộc:

```text
AuthService nhận email/password, tìm user qua repository, kiểm tra password hash, kiểm tra role và tạo JWT bằng TokenHelper. Frontend admin chỉ cho user có role Admin hoặc Staff vào hệ thống.
```

## VII. Module Catalog: xe máy, phụ tùng, danh mục, hãng

### 1. Frontend

File cần nắm:

- `ProductList.jsx`
- `ProductForm.jsx`
- `VariantManager.jsx`
- `ImageManager.jsx`
- `CompatibilityManager.jsx`
- `ProductRelatedManager.jsx`
- `ProductPromotionsModal.jsx`
- `ProductInventoryAgingModal.jsx`
- `ProductBarcodeModal.jsx`
- `CategoryList.jsx`
- `BrandList.jsx`
- `ManufacturerList.jsx`
- `productService.js`
- `categoryService.js`
- `brandService.js`
- `manufacturerService.js`

Điểm hiện tại:

- `/motorcycles` dùng `ProductList productType="XeMay"`.
- `/parts` dùng `ProductList productType="PhuTung"`.
- Product có:
  - thông tin chính;
  - SKU/biến thể;
  - ảnh;
  - tương thích xe;
  - sản phẩm liên quan;
  - khuyến mãi;
  - tồn kho lâu ngày;
  - barcode.

### 2. Backend

File cần nắm:

- `ProductsController.cs`
- `ProductsController.Skus.cs`
- `ProductsController.Images.cs`
- `ProductsController.Compatibilities.cs`
- `ProductsController.RelatedExtras.cs`
- `CatalogService.ProductsManufacturers.cs`
- `CatalogService.LookupsSkusImages.cs`
- `CatalogService.CompatibilityExtrasMapping.cs`
- `CatalogService.BrandsModelsCategories.cs`
- `ProductRepository.cs`
- `SkuRepository.cs`
- `ProductImageRepository.cs`
- `CatalogDtos.cs`
- `Product.cs`
- `CatalogConfiguration.cs`

Luồng danh sách sản phẩm:

```text
ProductList.jsx
-> productService.getAll(params)
-> GET /api/products
-> ProductsController.Search
-> CatalogService.SearchProductsAsync
-> ProductRepository.SearchAsync
-> Products + Skus + Images
-> PagingResponse<ProductListItem>
-> frontend render bảng
```

Luồng thêm sản phẩm:

```text
ProductForm.jsx
-> handleSubmit()
-> productService.create(payload)
-> POST /api/products
-> ProductsController.Create
-> CatalogService.CreateProductAsync
-> validate name/listPrice/code/slug
-> tạo Product
-> tạo SKU mặc định
-> SaveChanges
```

Luồng upload ảnh sản phẩm:

```text
ImageManager.jsx
-> productService.uploadImage(productId, FormData)
-> POST /api/products/{id}/images
-> ProductsController.UploadImage
-> LocalImageStorage.SaveAsync(file, "products")
-> CatalogService.AddImageAsync
-> lưu ProductImage
```

Câu trả lời học thuộc:

```text
Catalog không chỉ CRUD Product. Product còn có SKU, ảnh, tương thích xe, sản phẩm liên quan, barcode và tồn kho. Backend tách ProductsController thành nhiều partial file để mỗi nhóm endpoint dễ theo dõi.
```

## VIII. Module Orders, POS, Payment

### 1. Frontend

File cần nắm:

- `OrderList.jsx`
- `OrderDetail.jsx`
- `PosOrder.jsx`
- `orderService.js`
- `paymentService.js`
- `utils/vatInvoice.js`
- `utils/moneyInput.js`

### 2. Backend

File cần nắm:

- `OrdersController.cs`
- `OrdersController.Admin.cs`
- `OrderService.cs`
- `OrderService.Cart.cs`
- `OrderService.Checkout.cs`
- `OrderService.Pos.cs`
- `OrderService.QueryAllocationFulfillment.cs`
- `OrderService.StatusUpdates.cs`
- `OrderService.AdminUpdate.cs`
- `OrderService.Mapping.cs`
- `PaymentsController.cs`
- `PaymentService.RecordAndQuery.cs`
- `PaymentService.ConfirmAndClaim.cs`
- `PaymentService.Cancel.cs`
- `Order.cs`
- `Payment.cs`
- `OrderingDtos.cs`
- `PaymentDtos.cs`

Luồng danh sách đơn:

```text
OrderList.jsx
-> orderService.getAll(params)
-> GET /api/orders
-> OrdersController.Search
-> OrderService.SearchOrdersAsync
-> OrderRepository / AppDbContext
-> PagingResponse<OrderListItem>
```

Luồng chi tiết đơn:

```text
OrderDetail.jsx
-> orderService.getById(id)
-> GET /api/orders/{id}
-> OrdersController.GetById
-> OrderService.GetOrderAsync
-> OrderService.Mapping.MapDetailAsync
-> OrderDetail DTO
```

Luồng POS:

```text
PosOrder.jsx
-> orderService.createPos(payload)
-> POST /api/orders/pos
-> OrdersController.CreatePos
-> OrderService.CreatePosOrderAsync
-> kiểm tra SKU/tồn kho
-> validate voucher nếu có
-> tạo Order/OrderLine
-> trừ kho hoặc giữ chỗ
-> ghi payment nếu có
```

Luồng thanh toán:

```text
OrderDetail.jsx
-> paymentService.record(data)
-> POST /api/payments
-> PaymentsController.Record
-> PaymentService.RecordPaymentAsync
-> tạo Payment
-> cập nhật PaymentStatus của Order nếu đủ tiền
```

Trạng thái phải thuộc:

| Trạng thái | Ý nghĩa |
|---|---|
| `OrderStatus` | Vòng đời đơn: Pending, Shipping, Delivered, Cancelled |
| `PaymentStatus` | Thanh toán: Unpaid, PendingConfirmation, Paid, Refunded, Failed |
| `FulfillmentStatus` | Xử lý hàng: Unallocated, Allocated, Shipped, Fulfilled |

Câu trả lời học thuộc:

```text
OrderStatus, PaymentStatus và FulfillmentStatus tách nhau vì một đơn có thể đã thanh toán nhưng chưa giao, hoặc đang giao nhưng COD vẫn chưa thanh toán. Backend phải xử lý các trục trạng thái riêng để đúng nghiệp vụ.
```

## IX. Module Inventory và Stock Documents

### 1. Frontend

File cần nắm:

- `InventoryView.jsx`
- `StockDocumentList.jsx`
- `inventoryService.js`
- `utils/exportExcel.js`

### 2. Backend

File cần nắm:

- `InventoryController.cs`
- `InventoryService.cs`
- `InventoryService.Queries.cs`
- `InventoryService.Adjustments.cs`
- `InventoryService.StockDocuments.cs`
- `InventoryService.GoodsReceipts.cs`
- `InventoryRepository.cs`
- `StockDocumentRepository.cs`
- `ReservationRepository.cs`
- `InventoryDtos.cs`
- `InventoryItem.cs`
- `StockMovement.cs`
- `StockDocument.cs`
- `Reservation.cs`

Công thức phải thuộc:

```text
Available = OnHand - Reserved
```

Giải thích:

```text
OnHand là tồn thực tế trong kho.
Reserved là số lượng đang giữ cho đơn chưa hoàn tất.
Available là số lượng còn bán được.
```

Luồng xem tồn kho:

```text
InventoryView.jsx
-> inventoryService.getAll(params)
-> GET /api/inventory
-> InventoryController.GetInventory
-> InventoryService.GetInventoryAsync
-> InventoryRepository.SearchAsync
-> InventoryListResult
```

Luồng điều chỉnh tồn:

```text
InventoryView.jsx
-> inventoryService.adjustStock(payload)
-> POST /api/inventory/adjust
-> InventoryController.Adjust
-> InventoryService.AdjustStockAsync
-> ApplyAsync
-> kiểm tra balanceAfter >= Reserved
-> cập nhật InventoryItem.OnHand
-> ghi StockMovement
```

Luồng phiếu kho:

```text
StockDocumentList.jsx
-> inventoryService.createDocument(payload)
-> POST /api/inventory/documents
-> InventoryService.CreateDocumentAsync
-> tạo StockDocument trạng thái Draft

StockDocumentList.jsx
-> inventoryService.approveDocument(id)
-> POST /api/inventory/documents/{id}/approve
-> InventoryService.ApproveDocumentAsync
-> ApplyDocumentLineAsync
-> cập nhật tồn kho
-> ghi StockMovement
```

## X. Module Voucher

### 1. Frontend

File cần nắm:

- `VoucherList.jsx`
- `voucherService.js`

### 2. Backend

File cần nắm:

- `VouchersController.cs`
- `VoucherService.cs`
- `VoucherService.Storefront.cs`
- `VoucherRepository.cs`
- `Voucher.cs`
- `OrderingDtos.cs`

Luồng CRUD:

```text
VoucherList.jsx
-> voucherService.create/update/delete
-> /api/vouchers
-> VouchersController
-> VoucherService
-> VoucherRepository / AppDbContext
```

Luồng validate voucher:

```text
OrderService.CheckoutAsync hoặc CreatePosOrderAsync
-> VoucherService.ValidateAsync(code, subtotal)
-> kiểm tra mã tồn tại
-> kiểm tra active
-> kiểm tra thời gian hiệu lực
-> kiểm tra min order
-> kiểm tra usage limit
-> tính discount
```

Câu trả lời học thuộc:

```text
Voucher không chỉ là CRUD. Khi tạo đơn, backend validate voucher và tính tiền giảm. Không để frontend tự quyết định số tiền giảm vì request có thể bị sửa.
```

## XI. Module Content: Banner, FAQ, Contact, Post

### 1. Frontend

File cần nắm:

- `HomeBannerList.jsx`
- `FaqList.jsx`
- `ContactList.jsx`
- `PostList.jsx`
- `bannerService.js`
- `faqService.js`
- `contactService.js`
- `postService.js`

### 2. Backend

File cần nắm:

- `ContentController.cs`
- `ContentController.Banners.cs`
- `ContentController.Faqs.cs`
- `ContentController.Contacts.cs`
- `ContentController.Posts.cs`
- `ContentService.cs`
- `ContentService.Banners.cs`
- `ContentService.Faqs.cs`
- `ContentService.Contacts.cs`
- `ContentService.Posts.cs`
- `ContentDtos.cs`
- `HomeBanner.cs`
- `Faq.cs`
- `ContactRequest.cs`
- `Post.cs`
- `ContentConfiguration.cs`
- `ImageStorage.cs`

### 3. Luồng banner hiện tại

Luồng tải danh sách:

```text
HomeBannerList.jsx
-> fetchBanners()
-> bannerService.getAll()
-> GET /api/content/home-banners?all=true
-> ContentController.Banners
-> ContentService.GetBannersAsync(all)
-> HomeBanners
```

Luồng upload ảnh banner:

```text
HomeBannerList.jsx
-> handleFileSelect()
-> FormData append file
-> bannerService.uploadImage(formData)
-> POST /api/content/home-banners/image
-> ContentController.UploadBannerImage
-> LocalImageStorage.SaveAsync(file, "banners")
-> validate file rỗng/đuôi file/kích thước <= 5MB
-> lưu vào wwwroot/uploads/banners
-> trả /uploads/banners/<file>
-> setForm({ urlAnh: url })
-> preview ảnh
```

Luồng lưu banner:

```text
HomeBannerList.jsx
-> handleSubmit()
-> bắt buộc form.urlAnh
-> bannerService.create/update(payload)
-> POST/PUT /api/content/home-banners
-> ContentController.CreateBanner/UpdateBanner
-> ContentService.CreateBannerAsync/UpdateBannerAsync
-> validate ImageUrl
-> lưu HomeBanner
```

Điểm cần nhấn mạnh do bạn vừa sửa:

```text
Trước đây có thể dán URL ảnh thủ công.
Bây giờ form bắt buộc chọn ảnh từ máy tính.
URL ảnh không nhập bằng tay mà do backend trả về sau khi upload.
```

### 4. Luồng contact

```text
ContactList.jsx
-> contactService.getAll(params)
-> GET /api/content/contacts
-> ContentController.Contacts
-> ContentService.SearchContactsAsync

ContactList.jsx
-> contactService.markProcessed(id)
-> PATCH /api/content/contacts/{id}/process
-> ContentService.MarkContactProcessedAsync
```

## XII. Module Customer, User, Warranty, Review

### 1. Users và Customers

Frontend:

- `UserList.jsx`
- `CustomerList.jsx`
- `userService.js`

Backend:

- `MoToSale.AuthService/Controllers/UsersController.cs`
- `UserManagementService.AdminUsers.cs`
- `UserManagementService.Customers.cs`
- `CustomerProfileService.cs`
- `CustomersController.cs`

Luồng quản lý tài khoản:

```text
UserList.jsx
-> userService.getAll/create/update/updateStatus/delete
-> /api/users...
-> UsersController
-> UserManagementService
-> Users/Roles/UserRoles
```

Luồng khách hàng:

```text
CustomerList.jsx
-> userService.getCustomers()
-> /api/users/customers
-> UserManagementService.Customers
```

### 2. Review

Frontend:

- `ReviewList.jsx`
- `reviewService.js`

Backend:

- `ReviewsController.cs`
- `StorefrontReviewsController.cs`
- `ReviewService.cs`
- `ReviewRepository.cs`
- `Review.cs`

Luồng admin duyệt review:

```text
ReviewList.jsx
-> reviewService.updateStatus(id, data)
-> PATCH /api/reviews/{id}/status
-> ReviewsController.UpdateStatus
-> ReviewService.UpdateStatusAsync
```

### 3. Warranty

Frontend:

- `WarrantyList.jsx`
- `warrantyService.js`

Backend:

- `WarrantiesController.cs`
- `WarrantyService.cs`
- `Warranty.cs`
- `WarrantyHistory.cs`

Luồng cập nhật bảo hành:

```text
WarrantyList.jsx
-> warrantyService.updateStatus(id, data)
-> PATCH /api/warranties/{id}/status
-> WarrantiesController.UpdateStatus
-> WarrantyService.UpdateStatusAsync
-> ghi WarrantyHistory
```

## XIII. Module Operations: mua hàng, đổi trả, tài chính, CRM, trả góp

Đây là phần mới/nặng hơn đề cương cũ. Nếu không đủ thời gian, học mức hiểu luồng và file chính.

### 1. Frontend

| Page | Vai trò |
|---|---|
| `BusinessOperations.jsx` | Màn hình tổng hợp cung ứng, dịch vụ, tài chính |
| `OperationalImports.jsx` | Import dữ liệu vận hành |
| `ReturnsRefunds.jsx` | Đổi trả, hoàn tiền |
| `StaffManagement.jsx` | Quản lý nhân sự/ca |
| `InstallmentApplications.jsx` | Hồ sơ trả góp |
| `OperationsSettings.jsx` | Cấu hình vận hành |

Service:

- `businessOperationsService.js`
- `advancedOperationsService.js`
- `installmentService.js`
- `operationsService.js`

### 2. Backend

Controller:

- `BusinessOperationsController.cs`
- `BusinessOperationsController.Suppliers.cs`
- `BusinessOperationsController.Purchases.cs`
- `BusinessOperationsController.Cash.cs`
- `BusinessOperationsController.Repairs.cs`
- `BusinessOperationsController.Interactions.cs`
- `BusinessOperationsController.Attendance.cs`
- `AdvancedOperationsController.cs`
- `InstallmentApplicationsController.cs`
- `OperationsController.cs`

Service:

- `BusinessOperationsService.cs`
- `BusinessOperationsService.Suppliers.cs`
- `BusinessOperationsService.PurchaseOrders.cs`
- `BusinessOperationsService.GoodsReceipts.cs`
- `BusinessOperationsService.Cash.cs`
- `BusinessOperationsService.Repairs.cs`
- `BusinessOperationsService.CrmAttendanceSummary.cs`
- `AdvancedOperationsService.cs`
- `AdvancedOperationsService.ReturnApproval.cs`
- `AdvancedOperationsService.RefundsReceivables.cs`
- `AdvancedOperationsService.StaffShifts.cs`
- `InstallmentService.cs`

Entity:

- `Supplier`
- `PurchaseOrder`
- `GoodsReceipt`
- `CashTransaction`
- `RepairOrder`
- `CustomerInteraction`
- `StaffAttendance`
- `SalesReturn`
- `Refund`
- `InstallmentApplication`

### 3. Luồng mua hàng/cung ứng

```text
BusinessOperations.jsx section="supply"
-> businessOperationsService.getSuppliers/getPurchases/createPurchase
-> /api/business-operations/...
-> BusinessOperationsController
-> BusinessOperationsService
-> Supplier/PurchaseOrder/GoodsReceipt
```

Luồng nhận hàng:

```text
businessOperationsService.receivePurchase(id, data)
-> POST /api/business-operations/purchases/{id}/receive
-> BusinessOperationsService.ReceivePurchaseAsync
-> tạo GoodsReceipt
-> cập nhật tồn kho hoặc ghi phiếu nhập
```

### 4. Luồng đổi trả/hoàn tiền

```text
ReturnsRefunds.jsx
-> advancedOperationsService.getReturns/createReturn/approveReturn/rejectReturn
-> /api/advanced-operations/returns
-> AdvancedOperationsController
-> AdvancedOperationsService
-> SalesReturn/SalesReturnLine/Refund
```

### 5. Luồng trả góp

```text
InstallmentApplications.jsx
-> installmentService.getAll/approve/reject
-> /api/installment-applications
-> InstallmentApplicationsController
-> InstallmentService
-> InstallmentApplication
```

## XIV. Module Reports, Audit, Settings

### 1. Reports

Frontend:

- `ReportsPage.jsx`
- `reportService.js`
- `RevenueChart.jsx`
- `OrderStatusChart.jsx`
- `TopProductChart.jsx`

Backend:

- `ReportsController.cs`
- `ReportService.cs`
- `ReportService.FinancialCalculations.cs`
- `ReportService.OperationsAndInventory.cs`
- `ReportService.SeriesAndCosts.cs`
- `ReportService.ServiceReceivablesCrm.cs`

Luồng:

```text
ReportsPage.jsx
-> reportService.getDashboard/getSummary/getReport
-> GET /api/reports/dashboard hoặc /api/reports
-> ReportsController
-> ReportService
-> tổng hợp Orders, Payments, Inventory, Cash, Purchase, Service
```

### 2. Audit logs

Frontend:

- `AuditLogList.jsx`
- `auditLogService.js`

Backend:

- `AuditLogsController.cs`
- `AuditLogService.cs`
- `AppDbContext.AuditTracking.cs`
- `AuditLog.cs`

Luồng:

```text
Entity thay đổi
-> AppDbContext.SaveChanges
-> CaptureAuditLogs
-> thêm AuditLog

AuditLogList.jsx
-> auditLogService.getAll(params)
-> GET /api/audit-logs
-> AuditLogsController
-> AuditLogService.SearchAsync
```

Câu trả lời học thuộc:

```text
Audit log trong project có hai kiểu: một số nghiệp vụ ghi audit thủ công trong controller/service, và AppDbContext cũng có cơ chế capture thay đổi entity khi SaveChanges.
```

### 3. Settings

Frontend:

- `OperationsSettings.jsx`
- `operationsService.js`

Backend:

- `OperationsController.cs`
- `StorefrontSettingsService.cs`
- `Setting.cs`

Luồng:

```text
OperationsSettings.jsx
-> operationsService.getSettings/saveSettings
-> /api/operations/settings
-> OperationsController
-> StorefrontSettingsService
-> Settings table
```

## XV. Upload ảnh và file tĩnh

Các nơi có upload ảnh:

- Banner trang chủ.
- Ảnh sản phẩm.
- Logo hãng/nhà sản xuất.
- Ảnh bài viết.

Backend dùng:

```text
IImageStorage
LocalImageStorage
wwwroot/uploads/{folder}
```

Điều kiện upload:

- File không rỗng.
- Đuôi file thuộc: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
- Tối đa 5MB.
- Tên file dùng `Guid`.
- Trả URL tương đối `/uploads/{folder}/{file}`.

Câu trả lời học thuộc:

```text
Frontend gửi FormData chứa file. Backend nhận qua [FromForm] UploadFileRequest, LocalImageStorage kiểm tra định dạng/kích thước, lưu vào wwwroot/uploads và trả URL. Vì APIService có UseStaticFiles nên frontend có thể dùng URL đó để preview hoặc hiển thị ảnh.
```

## XVI. Database, migration, seed

### 1. Code-first

Project dùng EF Core code-first:

```text
Entity
-> AppDbContext DbSet/config
-> Migration
-> SQL Server
```

Khi thay đổi schema:

```text
Sửa Entity/Configuration
-> dotnet ef migrations add <Name>
-> migration file sinh ra Up/Down
-> APIService chạy MigrateAsync hoặc update database
```

### 2. Khi nào cần migration?

Cần migration khi:

- Thêm bảng.
- Thêm/xoá/sửa cột.
- Đổi kiểu dữ liệu.
- Thêm/xoá quan hệ.
- Thêm index/constraint.

Không cần migration khi:

- Chỉ sửa UI.
- Chỉ sửa validate frontend.
- Chỉ sửa query filter.
- Chỉ thêm field response tính toán từ dữ liệu có sẵn.
- Chỉ sửa service JS map dữ liệu.

### 3. Seed

File cần biết:

- `SeedConfiguration.cs`
- `SeedConfiguration.Catalog.cs`
- `SeedConfiguration.Content.cs`
- `SeedConfiguration.Inventory.cs`
- `SeedConfiguration.Operations.cs`
- `SeedConfiguration.Vouchers.cs`
- `UserSeedConfiguration.cs`

Câu trả lời học thuộc:

```text
Seed dùng để tạo dữ liệu mẫu/ban đầu như user, catalog, content, inventory, voucher. Migration tạo cấu trúc bảng, còn seed tạo dữ liệu ban đầu.
```

## XVII. Các câu hỏi vấn đáp trọng tâm

### Nhóm 1 - Tổng quan

1. Em phụ trách phần nào?
2. Project gồm những module nào?
3. Frontend Admin khác Storefront thế nào?
4. Luồng request từ admin xuống database ra sao?
5. Vì sao tách Controller, Service, Repository?

Trả lời mẫu:

```text
Em phụ trách Backend và Frontend Admin. Admin là hệ thống quản trị, còn storefront là trang khách mua hàng. Luồng admin là page React gọi service JS, service dùng api.js gửi request kèm JWT qua API Gateway xuống Controller. Controller gọi Service xử lý nghiệp vụ, Service dùng Repository/AppDbContext để đọc ghi SQL Server. Tách tầng như vậy để UI, HTTP, nghiệp vụ và truy vấn dữ liệu không bị trộn lẫn.
```

### Nhóm 2 - Auth

1. Login admin đi qua những file nào?
2. JWT lưu ở đâu?
3. `ProtectedRoute` làm gì?
4. Nếu token hết hạn thì frontend làm gì?
5. Role Admin/Staff được kiểm tra ở đâu?

Trả lời mẫu:

```text
Login đi từ Login.jsx sang AuthContext.login, authService.login, api.post('/auth/login'), qua Gateway xuống AuthController và AuthService. Backend kiểm tra user/password rồi tạo JWT. Frontend lưu token vào localStorage, api.js tự gắn Authorization header. ProtectedRoute kiểm tra user và role trước khi cho vào route admin.
```

### Nhóm 3 - Catalog

1. Xe máy và phụ tùng dùng chung page nào?
2. Product có các phần phụ nào?
3. SKU khác Product thế nào?
4. Upload ảnh sản phẩm đi qua luồng nào?
5. Nếu thêm field mới cho Product thì sửa những file nào?

Trả lời mẫu:

```text
Xe máy và phụ tùng dùng chung ProductList, khác nhau ở productType. Product là sản phẩm chính, SKU là biến thể bán được với mã, giá, tồn kho. Product còn có ảnh, tương thích xe, sản phẩm liên quan, barcode và tồn kho. Nếu thêm field lưu DB thì sửa Entity, DTO, Service, frontend form/list và tạo migration.
```

### Nhóm 4 - Orders/POS/Payment

1. POS tạo đơn như thế nào?
2. OrderStatus, PaymentStatus, FulfillmentStatus khác nhau thế nào?
3. Khi huỷ đơn thì tồn kho xử lý ra sao?
4. Khi ghi nhận thanh toán thì backend làm gì?
5. Vì sao backend phải kiểm tra lại tồn kho dù frontend đã kiểm tra?

Trả lời mẫu:

```text
POS gửi danh sách SKU, số lượng, giá, khách hàng, voucher và thanh toán lên POST /api/orders/pos. Backend trong OrderService.CreatePosOrderAsync kiểm tra tồn khả dụng, validate voucher, tạo Order/OrderLine và xử lý trừ kho hoặc giữ chỗ. Backend phải kiểm tra lại vì request frontend có thể bị sửa.
```

### Nhóm 5 - Inventory

1. `OnHand`, `Reserved`, `Available` là gì?
2. Phiếu kho khác điều chỉnh tồn trực tiếp thế nào?
3. Vì sao giảm tồn không được nhỏ hơn Reserved?
4. StockMovement dùng để làm gì?
5. GoodsReceipt liên quan gì tới PurchaseOrder?

Trả lời mẫu:

```text
OnHand là tồn thực tế, Reserved là tồn đang giữ cho đơn, Available bằng OnHand trừ Reserved. StockMovement là lịch sử biến động kho. Khi giảm tồn phải đảm bảo OnHand sau giảm không nhỏ hơn Reserved, vì nếu không sẽ có đơn đang giữ hàng nhưng kho thực tế không đủ.
```

### Nhóm 6 - Content/Banner mới sửa

1. Banner trang chủ lấy dữ liệu từ đâu?
2. Upload ảnh banner đi qua những file nào?
3. Vì sao không nhập URL ảnh thủ công nữa?
4. Backend lưu ảnh banner ở đâu?
5. Nếu upload ảnh thất bại thì frontend xử lý thế nào?

Trả lời mẫu:

```text
Banner admin nằm ở HomeBannerList.jsx. Khi chọn file, frontend tạo FormData và gọi bannerService.uploadImage. Service gửi POST /api/content/home-banners/image. Backend nhận ở ContentController.UploadBannerImage, dùng LocalImageStorage lưu ảnh vào wwwroot/uploads/banners và trả URL. Sau đó frontend set urlAnh và preview ảnh. Em bỏ nhập URL thủ công để dữ liệu ảnh thống nhất qua upload của hệ thống.
```

### Nhóm 7 - Operations

1. BusinessOperations gồm những phần nào?
2. PurchaseOrder và GoodsReceipt liên quan gì?
3. ReturnsRefunds xử lý entity nào?
4. InstallmentApplications là gì?
5. Finance route vì sao chỉ Admin?

Trả lời mẫu:

```text
BusinessOperations gom các nghiệp vụ vận hành như nhà cung cấp, đơn mua hàng, nhập hàng, thu chi, sửa chữa, tương tác khách hàng và chấm công. PurchaseOrder là đơn mua với nhà cung cấp, GoodsReceipt là phiếu nhận hàng từ đơn mua. Finance liên quan thu chi/công nợ nên route chỉ Admin.
```

### Nhóm 8 - Audit/Reports/Settings

1. Reports lấy dữ liệu từ những bảng nào?
2. Audit log được tạo như thế nào?
3. Settings lưu ở đâu?
4. Vì sao report nên xử lý ở backend?
5. Dashboard admin khác report chi tiết thế nào?

Trả lời mẫu:

```text
Report tổng hợp dữ liệu từ orders, payments, inventory, cash, purchase và service. Nên xử lý ở backend vì cần query nhiều bảng, tính toán tập trung và tránh để frontend tự tính sai. Audit log được tạo khi AppDbContext SaveChanges capture thay đổi entity, ngoài ra một số nghiệp vụ cũng ghi audit thủ công.
```

## XVIII. Bài luyện code theo project hiện tại

### Bài 1. Code lại upload banner

Phải viết lại được:

```jsx
const handleFileSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await bannerService.uploadImage(formData);
    const url = res.data?.urlAnh;
    if (url) {
      setForm((prev) => ({ ...prev, urlAnh: url }));
    }
  } finally {
    setUploading(false);
  }
};
```

Nói được endpoint:

```text
POST /api/content/home-banners/image
```

### Bài 2. Code lại service upload banner

```js
uploadImage: async (formData) => {
  const response = await api.post('/content/home-banners/image', formData);
  response.data = {
    ...response.data,
    urlAnh: response.data?.urlAnh ?? response.data?.url ?? response.data?.imageUrl,
  };
  return response;
}
```

### Bài 3. Code lại fetch list chuẩn

```jsx
const fetchItems = async () => {
  setLoading(true);
  setError('');

  try {
    const res = await service.getAll(params);
    const data = res.data;
    setItems(data.items || data.data || data || []);
  } catch (err) {
    setError('Không thể tải dữ liệu.');
  } finally {
    setLoading(false);
  }
};
```

### Bài 4. Code lại Controller create/update pattern

```csharp
[Authorize(Roles = StaffRoles)]
[HttpPost]
public async Task<IActionResult> Create(SaveRequest request)
{
    try
    {
        var id = await _service.CreateAsync(request);
        return Ok(new IdResponse { Id = id });
    }
    catch (DomainException ex)
    {
        return BadRequest(new MessageResponse { Message = ex.Message });
    }
}
```

### Bài 5. Thêm một field lưu DB

Ví dụ thêm `Subtitle` cho banner:

```text
1. Sửa HomeBanner entity.
2. Sửa ContentDtos SaveBannerRequest/BannerDto.
3. Sửa ContentService.Banners map create/update/response.
4. Sửa HomeBannerList form và bannerService.mapPayload/normalizeBanner.
5. Tạo migration.
6. Chạy app để MigrateAsync áp migration.
```

## XIX. Lộ trình học đề cương này

### Buổi 1 - Nắm bản đồ project

Học:

- Mục I đến V.
- Vẽ lại luồng tổng quát.
- Đọc `App.jsx`, `Sidebar.jsx`, `Program.cs`, `AppDbContext.cs`.

Kết quả:

```text
Nhìn route hoặc file là biết thuộc module nào và tầng nào.
```

### Buổi 2 - Auth, Catalog, Orders

Học:

- Mục VI, VII, VIII.
- Tự nói lại luồng login, product list, product upload image, POS, payment.

Kết quả:

```text
Nắm chắc 3 luồng hay bị hỏi nhất: login, CRUD sản phẩm, tạo/cập nhật đơn.
```

### Buổi 3 - Inventory, Voucher, Content

Học:

- Mục IX, X, XI.
- Tập trung luồng banner mới sửa.

Kết quả:

```text
Giải thích được upload ảnh, tồn kho, voucher và nội dung storefront.
```

### Buổi 4 - Operations, Reports, Audit, luyện code

Học:

- Mục XII đến XVIII.
- Luyện code lại các bài nhỏ.

Kết quả:

```text
Có thể trả lời khi bị hỏi module mới và code lại đoạn nhỏ.
```

## XX. Bài nói 5 phút khi bảo vệ

```text
Project MoToSale v2 gồm frontend-admin, frontend-store và backend. Phần em phụ trách chính là Backend và Frontend Admin. Frontend Admin là hệ thống quản trị gồm dashboard, sản phẩm, đơn hàng, POS, voucher, tồn kho, nội dung storefront, khách hàng, bảo hành, vận hành, báo cáo và audit.

Luồng chung là page React giữ state và gọi service JS. Service JS dùng api.js để gửi request, api.js tự gắn JWT từ localStorage vào Authorization header. Request đi qua API Gateway xuống controller backend. Controller kiểm tra quyền và gọi service. Service xử lý nghiệp vụ, gọi repository hoặc AppDbContext để đọc ghi SQL Server. Entity mô tả bảng, DTO dùng cho request/response, migration dùng để cập nhật schema database.

Hiện project đã tách nhiều controller/service bằng partial class. Ví dụ ProductsController tách ảnh, SKU, tương thích; OrderService tách cart, checkout, POS, status; InventoryService tách query, adjustment, stock document. Cách này giúp file dễ đọc hơn nhưng khi build vẫn là cùng một class.

Một luồng mới em vừa sửa là banner trang chủ. Trước đây có thể nhập URL ảnh, còn hiện tại admin bắt buộc chọn ảnh từ máy. Frontend tạo FormData gửi lên POST /api/content/home-banners/image, backend dùng LocalImageStorage lưu vào wwwroot/uploads/banners và trả URL. Sau đó frontend preview ảnh và khi lưu banner thì gửi URL đó vào HomeBanner. APIService có UseStaticFiles nên URL /uploads/... có thể được frontend hiển thị.

Nếu giảng viên yêu cầu thêm chức năng nhỏ, em sẽ lần theo luồng page -> service JS -> endpoint -> controller -> service -> repository/database. Nếu chỉ thêm filter hoặc hiển thị thì không cần migration. Nếu thêm field lưu database thì phải sửa Entity, DTO, Service, frontend form và tạo migration mới.
```
