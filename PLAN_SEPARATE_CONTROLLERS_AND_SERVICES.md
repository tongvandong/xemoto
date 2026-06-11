# Plan: Tach Ro Controller Va Service Cho Toan Bo Backend

## Trang thai thuc hien

Da hoan thanh 100% theo Definition of Done luc ra soat ngay 2026-06-11.

Ket qua chinh:

- Da tao `AuditLogService`, `UserManagementService`, `ReportService`, `CustomerProfileService`, `StorefrontSettingsService`.
- Da dua query/report calculation/customer profile/settings/audit/user management ra khoi controller.
- Da mo rong `InventoryService` de xu ly goods receipts thay vi query truc tiep trong `InventoryController`.
- Da mo rong `BusinessOperationsService` de controller khong can doc `StaffAttendances` truc tiep.
- Da bo inject `AppDbContext` va repository truc tiep khoi controller API/Auth.
- Da register DI cho service moi trong `MoToSale.APIService` va `MoToSale.AuthService`.
- Da cap nhat test support/test controller bi anh huong.

Ket qua kiem tra:

- `rg -n "AppDbContext|IRepository<|\\.AsNoTracking\\(|\\.Where\\(|from .* in|SaveChangesAsync|_db\\." backend\src\MoToSale.APIService\Controllers backend\src\MoToSale.AuthService\Controllers -S`: khong con ket qua.
- `dotnet build backend\src\MoToSale.AuthService\MoToSale.AuthService.csproj`: pass.
- `dotnet build backend\src\MoToSale.APIService\MoToSale.APIService.csproj`: pass.
- `dotnet build backend\src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj`: pass.
- `dotnet test backend\tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore`: pass 20/20.
- Smoke qua Gateway public: `/health/auth`, `/health/api`, `/api/products`, `/api/showrooms`, `/api/vouchers/available`, `/api/auth/register`, `/api/auth/login`: pass.
- Smoke qua Gateway bang admin token: `/api/users/me`, `/api/users/customers`, `/api/reports/dashboard`, `/api/customers/{id}/profile`, `/api/inventory/goods-receipts`, `/api/business-operations/summary`, `/api/audit-logs`, `/api/operations/settings`: pass.
- `git diff --check`: khong co loi whitespace; chi co canh bao LF/CRLF cua Git tren Windows.

Ghi chu:

- Route dung cua customer profile hien tai la `/api/customers/{id}/profile`, khong phai `/api/customers/{id}`.
- Log runtime smoke khong co loi trong file `.err.log`.

## Muc tieu

Lam ro phan tach trach nhiem giua controller, service va repository.

Sau khi hoan thanh:

- Controller chi nhan request, lay user/role can thiet, goi service, tra response.
- Service chua nghiep vu, validate, audit, mapping phuc tap va dieu phoi repository.
- Repository chi chua query database bang LINQ ro rang.
- Khong doi route va response shape dang dung voi frontend.
- Khong doi database schema neu khong bat buoc.

## Quy tac sau refactor

Controller duoc phep:

- Doc body/query/path params.
- Lay `CurrentUserId`, `CurrentActorName`, `IsAdmin`, `IsStaff` neu can.
- Goi service.
- Bat exception nghiep vu.
- Tra `Ok`, `BadRequest`, `NotFound`, `Forbid`.

Controller khong nen:

- Inject `AppDbContext`.
- Inject repository truc tiep.
- Query LINQ database truc tiep.
- Goi `SaveChangesAsync`.
- Tu ghi audit log.
- Tu xu ly nghiep vu dai.

Service duoc phep:

- Inject repository hoac `AppDbContext` neu can query dac thu.
- Chua logic nghiep vu.
- Chua validate nghiep vu.
- Chua mapping response phuc tap.
- Goi audit service.
- Goi nhieu repository trong mot flow.

Repository duoc phep:

- Chua query LINQ database.
- Chua paging/filter/sort o muc truy van.
- Khong chua logic nghiep vu phuc tap.

## Tinh trang hien tai qua ra soat

Da tach kha tot:

- `AuthController`
- `ProductsController` phan CRUD/product chinh
- `ContentController`
- `VouchersController`
- `WarrantiesController`
- `CartController`
- `OrdersController` phan order/payment service chinh
- `PaymentsController`
- `AdvancedOperationsController` phan service chinh
- `BusinessOperationsController` phan service chinh

Chua tach ro:

- `MoToSale.AuthService/Controllers/UsersController.cs`
- `MoToSale.APIService/Controllers/ReportsController.cs`
- `MoToSale.APIService/Controllers/InventoryController.cs`
- `MoToSale.APIService/Controllers/CustomersController.cs`
- `MoToSale.APIService/Controllers/AuditLogsController.cs`
- `MoToSale.APIService/Controllers/OperationsController.cs`
- `MoToSale.APIService/Controllers/ShowroomsController.cs`
- `MoToSale.APIService/Controllers/InstallmentApplicationsController.cs`
- Cac controller co helper `AddAuditAsync` va inject `AppDbContext`.

## Phase 1 - Tao AuditLogService

Muc tieu: khong controller nao tu ghi audit log.

Tao:

- `backend/src/MoToSale.Services/Audit/IAuditLogService.cs`
- `backend/src/MoToSale.Services/Audit/AuditLogService.cs`

API de xuat:

```csharp
Task AddAsync(string entity, string entityId, string action, string? newValue, int? actorId, string? actorName);
Task<PagingResponse<AuditLogDto>> SearchAsync(AuditLogSearchRequest request);
```

Can lam:

- Tao DTO request/response neu chua co:
  - `AuditLogSearchRequest`
  - `AuditLogDto`
- Chuyen ghi audit tu cac controller sang service:
  - `OrdersController`
  - `BusinessOperationsController`
  - `AdvancedOperationsController`
  - `InventoryController`
  - `InstallmentApplicationsController`
- Chuyen filter/paging trong `AuditLogsController` sang `AuditLogService`.

Ket qua mong muon:

- Controller khong con `_db.AuditLogs.Add`.
- Controller khong con `_db.SaveChangesAsync`.
- `AuditLogsController` khong inject `AppDbContext`.

## Phase 2 - Tao UserManagementService

Muc tieu: `UsersController` khong xu ly nghiep vu user truc tiep.

Tao:

- `backend/src/MoToSale.Services/Identity/IUserManagementService.cs`
- `backend/src/MoToSale.Services/Identity/UserManagementService.cs`

Chuyen tu `UsersController` sang service:

- Update profile.
- Change password.
- Get addresses.
- Add address.
- List admin/staff users.
- List customers.
- Create customer.
- Update customer.
- Update care note.
- Get user by id.
- Create admin/staff user.
- Update admin/staff user.
- Set user status.
- Soft delete user.
- Validate khong khoa/xoa admin cuoi cung.
- Generate customer email.
- Normalize role/status.

Ket qua mong muon:

- `UsersController` khong inject:
  - `IUserRepository`
  - `IAddressRepository`
  - `IPasswordHasher`
  - `AppDbContext`
- `UsersController` chi inject:
  - `IAuthService`
  - `IUserManagementService`

## Phase 3 - Tao ReportService

Muc tieu: `ReportsController` khong chua query/report calculation.

Tao:

- `backend/src/MoToSale.Services/Reports/IReportService.cs`
- `backend/src/MoToSale.Services/Reports/ReportService.cs`

Chuyen tu `ReportsController` sang service:

- Summary.
- Dashboard.
- Report theo date range.
- Revenue series.
- Order status series.
- Top products.
- Avg cost map.
- COGS.
- Refund adjustment.
- Return resellable adjustment.
- Dashboard operations.
- Inventory warnings.
- Purchase report.
- Cash report.
- Service report.
- Receivable report.
- CRM tasks.

Ket qua mong muon:

- `ReportsController` khong inject `AppDbContext`.
- `ReportsController` chi goi:
  - `GetSummaryAsync()`
  - `GetDashboardAsync()`
  - `GetReportAsync(startDate, endDate, top)`

## Phase 4 - Tao CustomerProfileService

Muc tieu: `CustomersController` khong query DB truc tiep.

Tao:

- `backend/src/MoToSale.Services/Customers/ICustomerProfileService.cs`
- `backend/src/MoToSale.Services/Customers/CustomerProfileService.cs`

Chuyen tu `CustomersController` sang service:

- Customer detail.
- Orders by customer.
- Warranties by customer.
- Repairs by customer.
- Interactions by customer.
- Mapping customer profile response.

Ket qua mong muon:

- `CustomersController` khong inject `AppDbContext`.
- Khong con `.AsNoTracking()`, `.Where()`, query LINQ trong controller.

## Phase 5 - Lam sach InventoryController

Muc tieu: `InventoryController` chi goi `IInventoryService`.

Mo rong:

- `IInventoryService`
- `InventoryService`

Hoac tao rieng:

- `IGoodsReceiptService`
- `GoodsReceiptService`

Chuyen khoi controller:

- Search goods receipts.
- Get goods receipt detail.
- Query `GoodsReceipts`.
- Query `GoodsReceiptLines`.
- Join `PurchaseOrders`, `Suppliers`, `Skus`, `Products`.
- Audit cho create/approve/cancel/adjust/sync.

Ket qua mong muon:

- `InventoryController` khong inject `AppDbContext`.
- `InventoryController` khong tu query receipt/detail.
- Audit do service goi `IAuditLogService`.

## Phase 6 - Tao StorefrontSettingsService

Muc tieu: setting/showroom khong duoc map truc tiep trong controller.

Tao:

- `backend/src/MoToSale.Services/Settings/IStorefrontSettingsService.cs`
- `backend/src/MoToSale.Services/Settings/StorefrontSettingsService.cs`

Chuyen tu:

- `OperationsController`
- `ShowroomsController`

Sang service:

- Get settings.
- Save setting.
- Build showroom/store response tu settings.
- Pick setting theo nhieu key fallback.

Ket qua mong muon:

- Controller khong inject `IRepository<Setting>`.
- Controller khong tu map dictionary settings.

## Phase 7 - Lam sach InstallmentApplicationsController

Muc tieu: controller khong inject `AppDbContext` chi de audit.

Can lam:

- Giu `IInstallmentService`.
- Them `IAuditLogService`.
- Chuyen audit sang service.

Ket qua mong muon:

- `InstallmentApplicationsController` khong inject `AppDbContext`.
- Khong con `_db.AuditLogs.Add`.

## Phase 8 - Xem lai Operations/Business/Advanced Controllers

Muc tieu: cac controller operations khong con helper audit tu viet.

Can lam:

- `BusinessOperationsController` dung `IAuditLogService`.
- `AdvancedOperationsController` dung `IAuditLogService`.
- Neu action can check DB truc tiep, dua check do vao service.
- `BusinessOperationsController.CheckOut` dang query `_db.StaffAttendances.FindAsync(id)` can dua vao `IBusinessOperationsService`.

Ket qua mong muon:

- Khong con `AppDbContext` trong cac operations controller.
- Controller chi goi service nghiep vu va audit service neu audit chua nam trong service.

## Phase 9 - Register DI

Cap nhat DI trong:

- `backend/src/MoToSale.APIService/Program.cs`
- `backend/src/MoToSale.AuthService/Program.cs`

Them dang ky:

```csharp
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ICustomerProfileService, CustomerProfileService>();
builder.Services.AddScoped<IStorefrontSettingsService, StorefrontSettingsService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
```

Neu tao `IGoodsReceiptService`:

```csharp
builder.Services.AddScoped<IGoodsReceiptService, GoodsReceiptService>();
```

## Phase 10 - Chuan hoa exception

Muc tieu: controller bat exception nghiep vu, khong bat loi database chung.

Tao neu can:

- `UserManagementException`
- `ReportException`
- `CustomerProfileException`
- `StorefrontSettingsException`
- `AuditLogException`

Quy tac:

- Service throw exception nghiep vu co message ro.
- Controller catch exception do va tra `BadRequest`.
- `NotFound` co the do service tra `null` hoac throw exception tuy pattern module.

## Phase 11 - Audit sau refactor

Chay lenh:

```powershell
rg -n "AppDbContext|IRepository<|\\.AsNoTracking\\(|\\.Where\\(|from .* in|SaveChangesAsync|_db\\." backend\src\MoToSale.APIService\Controllers backend\src\MoToSale.AuthService\Controllers
```

Muc tieu:

- Khong con `AppDbContext` trong controller.
- Khong con `IRepository<>` trong controller.
- Khong con LINQ database trong controller.
- Khong con `SaveChangesAsync` trong controller.
- Khong con `_db.` trong controller.

Chap nhan co ngoai le nho:

- LINQ tren collection response nho, neu khong lien quan database.
- Lay claim user/role trong controller.

## Phase 12 - Build, Test, Smoke Test

Build:

```powershell
dotnet build backend\src\MoToSale.AuthService\MoToSale.AuthService.csproj
dotnet build backend\src\MoToSale.APIService\MoToSale.APIService.csproj
dotnet build backend\src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj
```

Test:

```powershell
dotnet test backend\tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore
```

Runtime smoke test qua Gateway:

- `GET /health/auth`
- `GET /health/api`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/products`
- `GET /api/reports/dashboard`
- `GET /api/customers/{id}`
- `GET /api/inventory/goods-receipts`
- `GET /api/showrooms`
- `GET /api/business-operations/summary`

## Definition of Done

- Controller khong con DB/repository truc tiep.
- Controller khong con query LINQ database.
- Controller khong con `SaveChangesAsync`.
- Controller khong con helper audit tu ghi DB.
- Service chua nghiep vu va dieu phoi repository.
- Repository chua query database.
- Route va response shape khong doi.
- Build 3 service pass.
- Backend tests pass.
- Smoke test qua Gateway pass.
- Khong commit config local, `.env`, log, backup folder.
