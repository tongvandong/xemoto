# Plan: Student-Readable Backend Cleanup Full

## Muc tieu

Lam backend de doc hon cho sinh vien trinh do chua cao, nhung khong doi hanh vi API dang dung voi frontend.

Sau khi hoan thanh:

- Controller ngan, ro, khong co logic an.
- Service khong qua dai, moi service co mot nhom nghiep vu chinh.
- Khong con `Task<object>` / `PagingResponse<object>` trong service contract.
- Khong con response anonymous object phuc tap o service.
- Khong con reflection nhu `GetType().GetProperty("id")`.
- DTO doc duoc tung property, khong bi mot dong qua dai.
- Query va mapping viet ro tung buoc, uu tien de hieu hon viet ngan.
- `AppDbContext` bot dai va bot dong gop.
- Build, test, smoke test deu pass sau moi nhom thay doi.

## Nguyen tac refactor

- Khong doi route.
- Khong doi response JSON neu frontend dang phu thuoc.
- Khong doi database schema neu khong bat buoc.
- Khong doi business rule khi chi dang cleanup.
- Tach nho theo nhom nghiep vu, moi phase build/test rieng.
- Uu tien code dai hon mot chut nhung de doc hon.
- Neu can giu response shape cu, tao DTO co property trung ten JSON cu.
- Khong sua file migration EF tu sinh, tru khi migration do dang sai.

## Tinh trang hien tai qua ra soat

Da tot:

- Controller API/Auth khong con inject `AppDbContext`.
- Controller API/Auth khong con inject repository truc tiep.
- Controller API/Auth khong con query LINQ database truc tiep.
- Controller API/Auth khong con `_db.` hoac `SaveChangesAsync`.
- Logic lon da nam o service.

Con kho doc:

- `backend/src/MoToSale.Services/Ordering/OrderService.cs`: khoang 994 dong.
- `backend/src/MoToSale.Services/Catalog/CatalogService.cs`: khoang 854 dong.
- `backend/src/MoToSale.Repository/AppDbContext.cs`: khoang 752 dong, nhieu config viet gop dong.
- `backend/src/MoToSale.Services/Reports/ReportService.cs`: khoang 541 dong.
- `backend/src/MoToSale.Services/Identity/UserManagementService.cs`: khoang 524 dong.
- `backend/src/MoToSale.Services/Content/ContentService.cs`: khoang 475 dong.
- `backend/src/MoToSale.Services/Payments/PaymentService.cs`: khoang 466 dong.
- `backend/src/MoToSale.Services/Operations/BusinessOperationsService.cs`: tuy chi khoang 284 dong nhung gom qua nhieu nghiep vu va con dung `object`.
- `backend/src/MoToSale.APIService/Controllers/BusinessOperationsController.cs`: con reflection de doc `id`.
- Nhieu DTO dang dung `record` mot dong dai, kho doc voi nguoi moi.

## Definition of Done

- Khong con `Task<object>` hoac `PagingResponse<object>` trong `backend/src/MoToSale.Services`.
- Khong con `object?` trong service contract, tru truong hop thuc su can generic.
- Khong con `GetType().GetProperty(...)` trong controller/service.
- Moi service chinh nen duoi 350 dong, tru truong hop hop ly va co section ro.
- Moi controller chinh nen duoi 250 dong neu co the.
- DTO quan trong duoc viet dang class/property hoac record nhieu dong de de doc.
- `AppDbContext.OnModelCreating` duoc tach bot sang configuration class hoac viet lai tung dong ro rang.
- Cac query phuc tap co ten ham ro rang.
- Build 3 service pass.
- Backend tests pass.
- Smoke test qua Gateway pass.

## Phase 0 - Lap baseline truoc khi sua

Can lam:

- Chay build:
  - `dotnet build backend\src\MoToSale.AuthService\MoToSale.AuthService.csproj`
  - `dotnet build backend\src\MoToSale.APIService\MoToSale.APIService.csproj`
  - `dotnet build backend\src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj`
- Chay test:
  - `dotnet test backend\tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore`
- Chay audit code:
  - `rg -n "Task<object|PagingResponse<object>|GetType\(\)|GetProperty\(|public record .*\\(.*\\)" backend\src -g "*.cs" -g "!**/Migrations/**"`
- Ghi lai route smoke can giu.

Ket qua mong muon:

- Biet ro trang thai truoc khi refactor.
- Neu baseline fail, sua loi baseline truoc khi cleanup.

## Phase 1 - Tao DTO response chung de bo anonymous object nho

Muc tieu: controller/service khong tra `new { id }`, `new { message }`, `new { items }` lung tung.

Tao file:

- `backend/src/MoToSale.DTO/Common/CommonResponseDtos.cs`

DTO de xuat:

```csharp
public class IdResponse
{
    public int Id { get; set; }
}

public class MessageResponse
{
    public string Message { get; set; } = string.Empty;
}

public class ItemsResponse<T>
{
    public List<T> Items { get; set; } = new List<T>();
}
```

Can lam:

- Dung `IdResponse` thay `new { id }` o controller.
- Dung `MessageResponse` thay `new { message }` o controller.
- Dung `ItemsResponse<T>` thay `new { items = ... }` o service.

Ket qua mong muon:

- Response JSON van la `id`, `message`, `items`.
- Code ro hon, khong can reflection.

## Phase 2 - Lam sach BusinessOperationsService truoc

Day la diem uu tien cao nhat vi con nhieu `Task<object>` va gom nhieu nghiep vu.

### Phase 2.1 - Tao DTO ro cho Business Operations

Mo rong file:

- `backend/src/MoToSale.DTO/Operations/BusinessOperationsDtos.cs`

Them DTO:

- `BusinessLookupResponse`
- `LookupSkuDto`
- `LookupSupplierDto`
- `LookupUserDto`
- `LookupOrderDto`
- `LookupOrderLineDto`
- `SupplierDto`
- `PurchaseOrderDto`
- `PurchaseOrderLineDto`
- `CashTransactionDto`
- `RepairOrderDto`
- `RepairOrderLineDto`
- `RepairHistoryDto`
- `CustomerInteractionDto`
- `StaffAttendanceDto`
- `BusinessSummaryDto`

Quy tac:

- Property dat ten trung response cu de frontend khong vo.
- Neu response cu dung camelCase, giu serializer policy hien tai de ra camelCase.

### Phase 2.2 - Sua IBusinessOperationsService

File:

- `backend/src/MoToSale.Services/Operations/IBusinessOperationsService.cs`

Doi:

- `Task<object> GetLookupsAsync()` thanh `Task<BusinessLookupResponse> GetLookupsAsync()`
- `Task<object> GetSuppliersAsync()` thanh `Task<ItemsResponse<SupplierDto>> GetSuppliersAsync()`
- `Task<object> GetPurchaseOrdersAsync()` thanh `Task<ItemsResponse<PurchaseOrderDto>> GetPurchaseOrdersAsync()`
- `Task<object> GetCashTransactionsAsync()` thanh `Task<ItemsResponse<CashTransactionDto>> GetCashTransactionsAsync()`
- `Task<object> GetRepairsAsync()` thanh `Task<ItemsResponse<RepairOrderDto>> GetRepairsAsync()`
- `Task<object> GetInteractionsAsync()` thanh `Task<ItemsResponse<CustomerInteractionDto>> GetInteractionsAsync()`
- `Task<object> GetAttendanceAsync()` thanh `Task<ItemsResponse<StaffAttendanceDto>> GetAttendanceAsync()`
- `Task<object> GetSummaryAsync(bool includeFinancials)` thanh `Task<BusinessSummaryDto> GetSummaryAsync(bool includeFinancials)`

Ket qua mong muon:

- Khong con `Task<object>` trong interface nay.
- Controller goi service y nhu cu, nhung type ro rang.

### Phase 2.3 - Tach BusinessOperationsService thanh cac service nho

Tao:

- `backend/src/MoToSale.Services/Operations/Suppliers/ISupplierService.cs`
- `backend/src/MoToSale.Services/Operations/Suppliers/SupplierService.cs`
- `backend/src/MoToSale.Services/Operations/Purchases/IPurchaseOrderService.cs`
- `backend/src/MoToSale.Services/Operations/Purchases/PurchaseOrderService.cs`
- `backend/src/MoToSale.Services/Operations/Cash/ICashTransactionService.cs`
- `backend/src/MoToSale.Services/Operations/Cash/CashTransactionService.cs`
- `backend/src/MoToSale.Services/Operations/Repairs/IRepairOrderService.cs`
- `backend/src/MoToSale.Services/Operations/Repairs/RepairOrderService.cs`
- `backend/src/MoToSale.Services/Operations/Crm/ICustomerInteractionService.cs`
- `backend/src/MoToSale.Services/Operations/Crm/CustomerInteractionService.cs`
- `backend/src/MoToSale.Services/Operations/Attendance/IStaffAttendanceService.cs`
- `backend/src/MoToSale.Services/Operations/Attendance/StaffAttendanceService.cs`
- `backend/src/MoToSale.Services/Operations/Summary/IBusinessSummaryService.cs`
- `backend/src/MoToSale.Services/Operations/Summary/BusinessSummaryService.cs`

Hai cach lam chap nhan:

- Cach A: `BusinessOperationsController` inject cac service nho.
- Cach B: giu `IBusinessOperationsService` lam facade, facade goi cac service nho.

Khuyen nghi:

- Dung Cach B truoc de it doi controller.
- Sau do neu muon moi tach controller.

Ket qua mong muon:

- `BusinessOperationsService.cs` chi con facade duoi 120 dong hoac duoc xoa.
- Moi service nho duoi 250 dong.
- Query va validate tung nghiep vu nam dung service.

### Phase 2.4 - Bo reflection trong BusinessOperationsController

File:

- `backend/src/MoToSale.APIService/Controllers/BusinessOperationsController.cs`

Can lam:

- Sua helper `RunWithAuditAsync` de nhan `int id` truc tiep tu service result.
- Hoac doi method tao moi tra `IdResponse`, controller lay `.Id`.
- Xoa `ReadIdFromOkObject`.

Ket qua mong muon:

- Khong con `GetType().GetProperty("id")`.
- Flow audit de doc hon.

## Phase 3 - Tach OrderService thanh cac service theo use case

File hien tai:

- `backend/src/MoToSale.Services/Ordering/OrderService.cs`

Muc tieu:

- Sinh vien doc don hang theo tung flow, khong phai doc mot file gan 1000 dong.

Tao service:

- `ICartService` / `CartService`
- `ICheckoutService` / `CheckoutService`
- `IOrderQueryService` / `OrderQueryService`
- `IOrderStatusService` / `OrderStatusService`
- `IOrderAllocationService` / `OrderAllocationService`
- `IOrderFulfillmentService` / `OrderFulfillmentService`
- `IPosOrderService` / `PosOrderService`

Mapping de xuat:

- Cart:
  - `GetCartAsync`
  - `AddItemAsync`
  - `UpdateItemAsync`
  - `RemoveItemAsync`
- Checkout:
  - `CheckoutAsync`
  - validate voucher/deposit/shipping info
- Query:
  - `SearchAsync`
  - `GetDetailAsync`
  - `GetMyOrdersAsync`
  - `MapDetailAsync`
  - `MapCartAsync`
- Allocation:
  - `SuggestAllocationsAsync`
  - `AllocateAsync`
  - reservation helpers
- Status/Fulfillment:
  - `UpdateStatusAsync`
  - `UpdateFulfillmentStatusAsync`
  - `FulfillCoreAsync`
  - `CancelOrderAsync`
- POS:
  - `CreatePosOrderAsync`

Quy tac:

- Co the giu `IOrderService` lam facade de controller khong doi nhieu.
- Moi service nho co dependency it nhat co the.
- Helper nao dung chung thi tao `OrderMappingService` hoac `OrderBusinessRules`.

Ket qua mong muon:

- `OrderService.cs` con facade duoi 180 dong hoac duoc tach het.
- Moi file nho co ten dung nghiep vu.

## Phase 4 - Tach CatalogService thanh nhom san pham/danh muc/lookup/phu kien

File hien tai:

- `backend/src/MoToSale.Services/Catalog/CatalogService.cs`

Tao service:

- `IProductService` / `ProductService`
- `ISkuService` / `SkuService`
- `IProductImageService` / `ProductImageService`
- `IManufacturerService` / `ManufacturerService`
- `IBrandService` / `BrandService`
- `IVehicleModelService` / `VehicleModelService`
- `ICategoryService` / `CategoryService`
- `ICompatibilityService` / `CompatibilityService`
- `IProductPromotionService` / `ProductPromotionService`
- `IProductRelatedItemService` / `ProductRelatedItemService`
- `IProductInventoryInfoService` / `ProductInventoryInfoService`

Mapping de xuat:

- Product CRUD/search/detail nam o `ProductService`.
- SKU CRUD/list nam o `SkuService`.
- Image CRUD nam o `ProductImageService`.
- Category/brand/model/manufacturer tach rieng.
- Compatibility, promotion, related item, aging, barcode tach rieng vi la tinh nang rieng.

Quy tac:

- Co the giu `ICatalogService` lam facade tam thoi.
- Xoa cac expression-bodied helper kho doc neu helper co logic.
- Viet `if`/`return` ro rang thay vi mot dong dai.

Ket qua mong muon:

- `CatalogService.cs` con facade duoi 150 dong hoac duoc thay bang cac service nho.
- Product controller co the van goi facade de khong doi route.

## Phase 5 - Lam ReportService de doc hon va query gon hon

File hien tai:

- `backend/src/MoToSale.Services/Reports/ReportService.cs`

Tao:

- `IReportQueryService` / `ReportQueryService`
- `IRevenueReportService` / `RevenueReportService`
- `IInventoryReportService` / `InventoryReportService`
- `IPurchaseReportService` / `PurchaseReportService`
- `ICashReportService` / `CashReportService`
- `IServiceReportService` / `ServiceReportService`
- `IReceivableReportService` / `ReceivableReportService`
- `ICrmReportService` / `CrmReportService`

Can lam:

- `ReportService` chi dieu phoi va ghep `ReportResponse`.
- Query nao theo ngay thi filter tu database truoc, han che load all roi `.Where` in-memory.
- Doi `Math.Clamp` sang ham `NormalizeTopLimit` neu muon de doc hon.
- Doi `GetValueOrDefault` sang helper `GetDecimalOrZero`/`GetStringOrFallback` neu can.
- Tach COGS/refund/return calculation thanh ham co ten ro.

Ket qua mong muon:

- `ReportService` duoi 180 dong.
- Moi report con duoi 220 dong.
- Code report co the doc theo tung khu vuc.

## Phase 6 - Lam UserManagementService co DTO ro, khong object

File:

- `backend/src/MoToSale.Services/Identity/IUserManagementService.cs`
- `backend/src/MoToSale.Services/Identity/UserManagementService.cs`
- `backend/src/MoToSale.DTO/Auth/AuthDtos.cs`

Can tao DTO:

- `UserListItemDto`
- `UserDetailDto`
- `AddressDto`
- `AddressListResponse`
- `CustomerListItemDto` neu `CustomerDto` hien tai chua du.

Can doi:

- `Task<object> GetAddressesAsync` -> `Task<ItemsResponse<AddressDto>>`
- `Task<PagingResponse<object>> SearchUsersAsync` -> `Task<PagingResponse<UserListItemDto>>`
- `Task<PagingResponse<object>> SearchCustomersAsync` -> `Task<PagingResponse<CustomerDto>>`
- `Task<object?> GetByIdAsync` -> `Task<UserDetailDto?>`

Co the tach them:

- `IProfileService`
- `IAddressService`
- `ICustomerManagementService`
- `IAdminUserService`

Ket qua mong muon:

- Khong con `object` trong user management service.
- Sinh vien nhin interface biet ngay response la gi.

## Phase 7 - Lam ContentService, PaymentService, InventoryService gon hon

### ContentService

File:

- `backend/src/MoToSale.Services/Content/ContentService.cs`

Tach theo nhom:

- `IPostService`
- `IFaqService`
- `IContactRequestService`
- `IHomeBannerService`

### PaymentService

File:

- `backend/src/MoToSale.Services/Payments/PaymentService.cs`

Tach theo nhom:

- `PaymentQueryService`
- `PaymentRecordingService`
- `PaymentConfirmationService`
- `PaymentCancellationService`

### InventoryService

File:

- `backend/src/MoToSale.Services/Inventory/InventoryService.cs`

Tach theo nhom:

- `InventoryQueryService`
- `StockDocumentService`
- `GoodsReceiptQueryService`
- `StockAdjustmentService`

Ket qua mong muon:

- Moi service chinh duoi 300-350 dong.
- Ten file phan anh dung nghiep vu.

## Phase 8 - Lam AppDbContext de doc hon

File hien tai:

- `backend/src/MoToSale.Repository/AppDbContext.cs`

Muc tieu:

- Sinh vien khong bi choang vi mot file context qua dai.

Cach lam de xuat:

Tao folder:

- `backend/src/MoToSale.Repository/Configurations`

Tach config:

- `IdentityConfiguration.cs`
- `CatalogConfiguration.cs`
- `InventoryConfiguration.cs`
- `OrderingConfiguration.cs`
- `PaymentConfiguration.cs`
- `ContentConfiguration.cs`
- `OperationConfiguration.cs`
- `SystemConfiguration.cs`
- `AuditConfiguration.cs`

Moi file co method:

```csharp
public static class CatalogConfiguration
{
    public static void Configure(ModelBuilder builder)
    {
        ConfigureBrand(builder);
        ConfigureProduct(builder);
    }
}
```

Can lam:

- Di chuyen cac `b.Entity<T>` sang file config theo domain.
- Trong `OnModelCreating`, chi goi:
  - `IdentityConfiguration.Configure(b);`
  - `CatalogConfiguration.Configure(b);`
  - ...
- Bung cac dong gop:
  - Moi `e.Property(...)` mot dong.
  - Moi `e.HasOne(...)` mot dong.
  - Moi check constraint mot dong rieng.

Ket qua mong muon:

- `AppDbContext.cs` con DbSet + SaveChanges override + call config, duoi 220 dong.
- Config domain de doc va de tim.

## Phase 9 - Chuan hoa DTO cho sinh vien

Muc tieu:

- DTO ro rang, moi property mot dong, tranh record 15 tham so.

Uu tien file:

- `backend/src/MoToSale.DTO/Operations/BusinessOperationsDtos.cs`
- `backend/src/MoToSale.DTO/Reports/ReportDtos.cs`
- `backend/src/MoToSale.DTO/Catalog/CatalogDtos.cs`
- `backend/src/MoToSale.DTO/Ordering/OrderingDtos.cs`
- `backend/src/MoToSale.DTO/Inventory/InventoryDtos.cs`
- `backend/src/MoToSale.DTO/Auth/AuthDtos.cs`
- `backend/src/MoToSale.DTO/Operations/AdvancedOperationsDtos.cs`

Quy tac:

- DTO ngan 2-4 field co the giu record.
- DTO dai hon 5 field nen doi sang class:

```csharp
public class ProductListItem
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
```

- Neu doi record sang class, cap nhat code khoi tao tu constructor sang object initializer.
- Giu ten property de JSON khong doi.

Ket qua mong muon:

- File DTO doc nhu hop dong API, khong phai doan constructor dai.
- Nguoi moi co the them field ma it so sai thu tu tham so.

## Phase 10 - Giam cu phap C# hien dai kho doc

Muc tieu:

- Khong can xoa het cu phap moi, chi doi nhung cho lam nguoi moi kho doc.

Can giam:

- `[]` collection expression trong service.
- `is not ("A" or "B")` neu lam dieu kien kho doc.
- `record with`.
- Expression-bodied method khi method co logic.
- Ternary long nested.
- `GetValueOrDefault` o nhieu noi neu co fallback nghiep vu.
- Constructor mot dong `public Service(...) => _db = db;`.

Thay bang:

- `new List<T>()`
- `if`/`else` ro rang.
- Method body co ngoac.
- Helper method co ten.

Vi du:

```csharp
private static bool IsValidPaymentMethod(string method)
{
    if (method == "Cash")
    {
        return true;
    }

    if (method == "BankTransfer")
    {
        return true;
    }

    return false;
}
```

Ket qua mong muon:

- Code dai hon nhung de lan luong hon.

## Phase 11 - Chuan hoa exception va response loi

Muc tieu:

- Controller bat loi giong nhau, sinh vien de copy pattern.

Can lam:

- Tao helper/base controller neu phu hop:
  - `HandleBusinessException`
  - `NotFoundMessage`
  - `BadRequestMessage`
- Hoac tao middleware exception handler neu muon gon controller.

Nhung tranh:

- Middleware qua phuc tap neu sinh vien kho hieu.

Khuyen nghi:

- Truoc mat giu catch trong controller, nhung thong nhat cach viet.

Ket qua mong muon:

- Cac controller tra loi cung style.
- Khong con moi controller viet mot kieu message object.

## Phase 12 - Chuan hoa repository LINQ cho de doc

Muc tieu:

- Repository query ro rang, khong viet mot dong dai.

Uu tien:

- `backend/src/MoToSale.Repository/Inventory/InventoryRepository.cs`
- `backend/src/MoToSale.Repository/Catalog/ProductRepository.cs`
- `backend/src/MoToSale.Repository/Ordering/OrderRepository.cs`
- `backend/src/MoToSale.Repository/Identity/UserRepository.cs`
- `backend/src/MoToSale.Repository/EFCore/Repository.cs`

Can lam:

- Tach method query phuc tap thanh cac helper:
  - `ApplySearchFilter`
  - `ApplyStatusFilter`
  - `ApplySorting`
  - `ToDto`
- Khong viet query qua dai trong mot chain.
- Neu query co nhieu `Include`, tach thanh method co ten.

Ket qua mong muon:

- Repository van la noi query DB.
- Sinh vien co the doc filter/sort theo tung buoc.

## Phase 13 - Them comment huong dan o diem kho

Muc tieu:

- Comment giai thich y nghia nghiep vu, khong comment nhung dong hien nhien.

Nen comment:

- Ly do stock ledger append-only.
- Ly do reservation/stock movement khi huy don.
- Ly do chi co mot admin active.
- Ly do category root `xe-may` va `phu-tung` khong duoc xoa.
- Ly do COGS/refund/return trong report.

Khong nen comment:

- `// gan ten`
- `// luu database`
- `// tra ve ket qua`

Ket qua mong muon:

- Nguoi hoc hieu "vi sao", khong chi "lam gi".

## Phase 14 - Cap nhat test sau khi tach service

Can lam:

- Cap nhat DI trong test factory.
- Them test nho cho service moi quan trong:
  - Supplier create/update.
  - Purchase order approve/receive/pay.
  - Repair status transition.
  - User search typed DTO.
  - Report date range.
  - Order cancel/refund flow neu chua co.
- Dam bao test cu van pass.

Ket qua mong muon:

- Refactor khong lam mat hanh vi cu.
- Service nho co test rieng de sinh vien de hoc.

## Phase 15 - Build, test, smoke sau moi dot

Sau moi phase lon, chay:

```powershell
dotnet build backend\src\MoToSale.AuthService\MoToSale.AuthService.csproj
dotnet build backend\src\MoToSale.APIService\MoToSale.APIService.csproj
dotnet build backend\src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj
dotnet test backend\tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore
```

Audit:

```powershell
rg -n "Task<object|PagingResponse<object>|GetType\(\)|GetProperty\(" backend\src -g "*.cs" -g "!**/Migrations/**"
```

Controller audit:

```powershell
rg -n "AppDbContext|IRepository<|\\.AsNoTracking\\(|\\.Where\\(|from .* in|SaveChangesAsync|_db\\." backend\src\MoToSale.APIService\Controllers backend\src\MoToSale.AuthService\Controllers -S
```

Smoke qua Gateway:

- `GET /health/auth`
- `GET /health/api`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/users/customers`
- `GET /api/products`
- `GET /api/reports/dashboard`
- `GET /api/customers/{id}/profile`
- `GET /api/inventory/goods-receipts`
- `GET /api/showrooms`
- `GET /api/business-operations/summary`
- `GET /api/audit-logs`
- `GET /api/operations/settings`

## Thu tu thuc hien khuyen nghi

1. Phase 1: tao response DTO chung.
2. Phase 2: lam sach BusinessOperationsService va bo reflection.
3. Phase 6: lam sach UserManagementService vi dang co `object`.
4. Phase 9: doi DTO dai sang class cho cac DTO bi anh huong truoc.
5. Phase 8: tach AppDbContext config.
6. Phase 3: tach OrderService.
7. Phase 4: tach CatalogService.
8. Phase 5: tach ReportService.
9. Phase 7: tach Content/Payment/Inventory.
10. Phase 10-13: style, repository, comment.
11. Phase 14-15: bo sung test va smoke tong.

## Rủi ro va cach kiem soat

- Doi DTO record sang class co the lam vo constructor call.
  - Cach kiem soat: build sau tung file DTO.
- Doi response object co the lam frontend sai neu property doi ten.
  - Cach kiem soat: giu property name, smoke frontend/admin cac man hinh lien quan.
- Tach service lon co the bi thieu DI.
  - Cach kiem soat: register DI ngay sau moi service moi, build ngay.
- Tach `AppDbContext` co the lam migration snapshot khong doi nhung runtime config sai.
  - Cach kiem soat: build + test + chay app migrate local.
- Refactor order/inventory co nguy co sai nghiep vu ton kho.
  - Cach kiem soat: uu tien test cancel/fulfill/adjust/receipt truoc va sau.

## Checklist hoan thanh

- [x] Phase 0 baseline pass.
- [x] Phase 1 common response DTO hoan thanh.
- [x] Phase 2 BusinessOperations typed DTO va service nho hoan thanh.
- [x] Phase 3 OrderService tach nho hoan thanh.
- [x] Phase 4 CatalogService tach nho hoan thanh.
- [x] Phase 5 ReportService tach nho hoan thanh.
- [x] Phase 6 UserManagementService typed DTO hoan thanh.
- [x] Phase 7 Content/Payment/Inventory cleanup hoan thanh.
- [x] Phase 8 AppDbContext config cleanup hoan thanh.
- [x] Phase 9 DTO cleanup hoan thanh.
- [x] Phase 10 cu phap kho doc cleanup hoan thanh.
- [x] Phase 11 exception/response loi thong nhat.
- [x] Phase 12 repository LINQ cleanup hoan thanh.
- [x] Phase 13 comment nghiep vu can thiet hoan thanh.
- [x] Phase 14 test bo sung/cap nhat hoan thanh.
- [x] Phase 15 build/test/smoke/audit pass.

## Ket qua thuc hien

Trang thai: hoan thanh.

Da lam:

- Them DTO response chung: `IdResponse`, `MessageResponse`, `UrlResponse`, `ChangedMessageResponse`, `ItemsResponse<T>`.
- Bo `Task<object>`, `PagingResponse<object>`, `object?` khoi service contract trong `backend/src`.
- Bo reflection `GetType().GetProperty(...)` khoi controller/service.
- Chuan hoa response `id`, `message`, `url` don gian trong controller sang DTO ro ten.
- Tach cac service lon thanh partial file theo nhom nghiep vu de sinh vien de tim code:
  - `BusinessOperationsService`
  - `OrderService`
  - `CatalogService`
  - `ReportService`
  - `ContentService`
  - `PaymentService`
  - `InventoryService`
  - `UserManagementService`
- Tach `AppDbContext` thanh cac file configuration theo domain trong `backend/src/MoToSale.Repository/Configurations`.
- Giu route va JSON shape cu cho frontend.
- Xoa file partial rong `BusinessOperationsService.Purchasing.cs`.

Da kiem tra:

- `dotnet build backend\src\MoToSale.AuthService\MoToSale.AuthService.csproj`: pass, 0 warning.
- `dotnet build backend\src\MoToSale.APIService\MoToSale.APIService.csproj`: pass, 0 warning.
- `dotnet build backend\src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj`: pass, 0 warning.
- `dotnet test backend\tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore`: pass 20/20.
- Audit `Task<object|PagingResponse<object>|object?|GetType()|GetProperty(` trong `backend/src`: khong con ket qua.
- Audit controller dung `AppDbContext`, repository truc tiep, LINQ database truc tiep: khong con ket qua.
- Audit controller response `new { message }`, `new { id }`, `new { url }` don gian: khong con ket qua.
- `git diff --check`: khong con loi whitespace, chi con warning LF/CRLF cua Git.
- Smoke qua Gateway `http://localhost:5100`: tat ca route trong plan tra `200`.
