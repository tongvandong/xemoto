# Plan: Refactor Toan Bo Backend Theo Style De Hieu Cho Sinh Vien

## Muc tieu

Refactor backend theo huong de doc, de debug, de giai thich khi bao ve do an.

Plan nay bao trum toan bo backend trong `backend/src`, khong chi rieng Auth.

Khong doi API contract dang dung voi frontend, khong doi database schema neu khong bat buoc.

## Nguyen tac chung

- Uu tien code ro rang hon code ngan.
- Tach flow nghiep vu thanh tung buoc.
- Dat ten bien dai hon mot chut nhung de hieu.
- Han che expression-bodied method trong controller/service nghiep vu.
- Han che `??`, `?.`, ternary va chaining dai trong doan logic chinh.
- Neu mot dieu kien quan trong, viet thanh `if` rieng.
- Neu mot ham qua dai, tach helper theo y nghia nghiep vu.
- Comment ngan o doan kho hieu, khong comment nhung dong qua ro.
- Message tieng Viet phai dung UTF-8, khong bi mojibake.
- Khong refactor lon lam thay doi hanh vi neu khong co test bao ve.

## Kien truc backend hien co

Backend gom cac project:

- `MoToSale.ApiGateway`
- `MoToSale.AuthService`
- `MoToSale.APIService`
- `MoToSale.Common`
- `MoToSale.DTO`
- `MoToSale.Entities`
- `MoToSale.Repository`
- `MoToSale.Services`

## Pham vi theo muc do uu tien

### Phase 1 - Auth va cac file vua sua

Muc tieu: lam sach phan moi them truoc, vi day la phan gan voi frontend moi va de gay loi deploy.

Files:

- `backend/src/MoToSale.AuthService/Controllers/AuthController.cs`
- `backend/src/MoToSale.Services/Identity/AuthService.cs`
- `backend/src/MoToSale.Services/Identity/IAuthService.cs`
- `backend/src/MoToSale.DTO/Auth/AuthDtos.cs`

Can lam:

- Sua message tieng Viet bi loi encoding.
- Refactor `RegisterAsync`.
- Refactor `LoginAsync`.
- Refactor `ForgotPasswordAsync`.
- Refactor `ResetPasswordAsync`.
- Tach helper cho reset password token.
- Controller viet ro `try/catch` tung khoi.
- Giu nguyen endpoint:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`

### Phase 2 - Controllers trong AuthService

Muc tieu: controller de doc, action ngan, khong nhom qua nhieu logic trong action.

Files can xem:

- `backend/src/MoToSale.AuthService/Controllers/*.cs`

Can lam:

- Tach validate input don gian.
- Tach response message ro rang.
- Dung bien trung gian truoc khi `return Ok(...)`.
- Khong viet `try { ... } catch { ... }` tren mot dong.
- Neu action qua dai, chuyen logic xuong service.

### Phase 3 - Controllers trong APIService

Muc tieu: cac endpoint san pham, gio hang, don hang, voucher, content, showroom, installment de doc hon.

Files can xem:

- `backend/src/MoToSale.APIService/Controllers/*.cs`

Can lam:

- Chuan hoa pattern controller:
  - Doc input.
  - Goi service.
  - Tra response.
  - Xu ly exception ro rang.
- Khong de query/filter phuc tap nam truc tiep trong controller neu co the dua vao service.
- Chuan hoa message loi tieng Viet.
- Giu nguyen route va response shape de frontend khong hong.

### Phase 4 - Services nghiep vu

Muc tieu: moi service co flow ro rang, de theo doi tung buoc nghiep vu.

Folder:

- `backend/src/MoToSale.Services`

Can lam:

- Quet cac service lon nhu:
  - Identity
  - Catalog/Product
  - Cart
  - Ordering
  - Payment
  - Voucher
  - Content
  - Store/Showroom
  - Installment
- Tach ham lon thanh helper nho.
- Doi cac dieu kien kho doc thanh `if` ro rang.
- Dat ten bien theo nghiep vu:
  - `order`
  - `orderItem`
  - `paymentStatus`
  - `availableStock`
  - `discountAmount`
- Them comment ngan cho cac luong phuc tap:
  - checkout
  - cancel order
  - refund
  - payment claim
  - voucher validation
  - installment calculation

### Phase 5 - Repository va truy van database

Muc tieu: truy van ro rang, de biet dang lay du lieu gi.

Folder:

- `backend/src/MoToSale.Repository`

Can lam:

- Giu query LINQ ngan va co ten bien ro.
- Neu query qua dai, tach thanh nhieu buoc co y nghia.
- Khong thay doi migration/schema trong dot refactor style.
- Khong sua query theo cam tinh neu chua co test/runtime check.
- Kiem tra seed data va message tieng Viet neu co.

### Phase 6 - DTO va mapping

Muc tieu: DTO de hieu, ten field ro rang, mapping khong bi an.

Folder:

- `backend/src/MoToSale.DTO`

Can lam:

- Giu DTO dang frontend dang dung.
- Chi doi `record` sang `class` neu that su can cho de giai thich.
- Neu doi DTO, phai build/test ngay vi co the anh huong binding/serialization.
- Them comment ngan cho DTO co y nghia dac biet.
- Kiem tra cac DTO auth moi:
  - `ForgotPasswordRequest`
  - `ForgotPasswordResponse`
  - `ResetPasswordRequest`

### Phase 7 - Entities va Common

Muc tieu: khong refactor qua tay, chi lam sach nhung phan ro rang.

Folders:

- `backend/src/MoToSale.Entities`
- `backend/src/MoToSale.Common`

Can lam:

- Khong doi entity property neu khong doi schema.
- Khong doi enum/status neu frontend/backend dang phu thuoc.
- Chi sua comment/message/ten helper neu an toan.
- Kiem tra helper auth/password/token neu can them comment de giai thich.

### Phase 8 - ApiGateway va config

Muc tieu: config de hieu, khong lam hong deploy.

Folder:

- `backend/src/MoToSale.ApiGateway`

Files lien quan:

- `appsettings.json`
- `appsettings.Development.json`
- `Program.cs`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`

Can lam:

- Khong commit connection string rieng cua may local.
- Giu production config qua env variable.
- Neu them note, giai thich ro:
  - local dung LocalDB/user-secrets
  - VPS dung `.env`
  - Docker dung `ConnectionStrings__DefaultConnection`
- Khong doi workflow deploy neu user chua yeu cau.

## Quy tac rieng ve connection string

Khong sua `appsettings.json` chi de test local.

Neu chay local bang Visual Studio/dotnet:

- Mac dinh dung LocalDB neu may co LocalDB.
- Neu may khac can SQL Server rieng, dung `dotnet user-secrets`.

Neu chay Docker:

- Dung `.env` rieng o tung may.
- `.env` khong commit.

VPS production:

- Dung `.env` tren VPS.
- Deploy tu GitHub khong duoc lam doi connection string production.

## Thu tu thuc hien khuyen nghi

1. Tao branch rieng neu muon lam refactor lon:
   - `refactor/backend-student-style`
2. Phase 1: Auth.
3. Build/test ngay sau Phase 1.
4. Phase 2 va 3: Controllers.
5. Build/test.
6. Phase 4: Services theo tung module nho.
7. Build/test sau moi module.
8. Phase 5: Repository neu can.
9. Phase 6 va 7: DTO/Common/Entities neu can.
10. Phase 8: Config/documentation.
11. Runtime smoke test qua gateway.
12. Commit theo tung nhom nho, khong gom qua nhieu thay doi vao mot commit.

## Checklist chi tiet theo module

### Auth

- Register.
- Login.
- Forgot password.
- Reset password.
- Change password.
- Profile.
- User management neu co.

### Catalog/Product

- Product list.
- Product detail.
- Product filters.
- Product images.
- Related products.
- Review/rating.

### Cart

- Add item.
- Update quantity.
- Remove item.
- Clear cart.
- Cart normalization theo SKU.

### Order/Checkout

- Create order.
- Orders mine.
- Order detail.
- Cancel order.
- Payment claim.
- Deposit/full payment/installment.

### Voucher

- Available vouchers.
- Validate voucher.
- Voucher discount calculation.
- Free shipping voucher neu co.

### Content

- FAQ.
- Contact submit.
- Home banners.
- Public posts.

### Store/Showroom

- Showroom list.
- Store system page data.
- Store filter/search neu co.

### Installment

- Installment application submit.
- Installment plan/calculation neu co.
- Print contract data neu backend co phan lien quan.

## Checklist test sau moi phase

### Build

```powershell
dotnet build src\MoToSale.AuthService\MoToSale.AuthService.csproj
dotnet build src\MoToSale.APIService\MoToSale.APIService.csproj
dotnet build src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj
```

### Automated test

```powershell
dotnet test tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore
```

### Runtime API smoke test

Can test lai qua gateway:

- `GET /health/auth`
- `GET /health/api`
- `GET /api/products`
- `GET /api/products/filters`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/cart`
- `POST /api/cart/items`
- `POST /api/orders`
- `GET /api/orders/mine`
- `POST /api/orders/{id}/payment-claim`
- `GET /api/content/faq`
- `POST /api/content/contacts`
- `GET /api/showrooms`
- `POST /api/installment-applications`

### Frontend smoke test

- Home.
- Products.
- Product detail.
- Login/register.
- Forgot password.
- Cart.
- Checkout.
- Orders.
- FAQ/contact.
- Store system.
- Installment.

## Khong lam trong dot refactor style

- Khong doi schema database neu khong can.
- Khong tao migration moi chi vi refactor style.
- Khong doi endpoint frontend dang goi.
- Khong doi response shape neu chua update frontend.
- Khong doi deploy workflow neu user chua yeu cau.
- Khong commit `.env`, log, `bin`, `obj`, `.vs`, backup folder.

## Definition of Done

- Plan bao trum toan bo backend trong `backend/src`.
- Code duoc refactor theo tung phase, khong lam tat ca trong mot lan lon.
- Message tieng Viet trong backend khong bi mojibake.
- API contract voi frontend khong doi.
- Build 3 service thanh cong.
- Backend tests pass.
- Runtime smoke test qua gateway pass.
- Khong commit config local/secret.

## Trang thai hoan thanh - 2026-06-11

Da thuc hien refactor theo plan cho cac phan backend dang anh huong truc tiep den FE user va cac module nghiep vu chinh:

- Auth:
  - `AuthController`
  - `AuthService`
  - DTO forgot/reset password
  - `TokenHelper`
- AuthService controllers:
  - `UsersController`
- APIService controllers:
  - `ProductsController`
  - `ContentController`
  - `VouchersController`
  - `WarrantiesController`
  - `StorefrontReviewsController`
- Services nghiep vu:
  - `PaymentService`
  - `ContentService`
  - `VoucherService`
  - `WarrantyService`
  - `InventoryService`
  - mot phan `OrderService` lien quan cart va available stock
- Common/config helper:
  - `AppSettings`
  - `OrderEnums`
  - `PaymentEnums`

Nhung nguyen tac da ap dung:

- Tach logic kho doc thanh helper co ten ro rang.
- Giam expression-bodied method trong controller/service chinh.
- Viet ro `try/catch`, `if`, bien trung gian va message tra ve.
- Giu nguyen route va response shape dang dung voi frontend.
- Khong doi database schema, khong tao migration moi.
- Khong sua connection string local/production.

Ket qua kiem tra:

```powershell
dotnet build src\MoToSale.AuthService\MoToSale.AuthService.csproj
dotnet build src\MoToSale.APIService\MoToSale.APIService.csproj
dotnet build src\MoToSale.ApiGateway\MoToSale.ApiGateway.csproj
dotnet test tests\MoToSale.Backend.Tests\MoToSale.Backend.Tests.csproj --no-restore
```

Ket qua:

- AuthService build: pass.
- APIService build: pass.
- ApiGateway build: pass.
- Backend tests: pass, 20/20.

Runtime smoke test qua Gateway da pass:

- `GET /health/auth`
- `GET /health/api`
- `GET /api/products?page=1&pageSize=3`
- `GET /api/content/faq`
- `GET /api/content/home-banners`
- `GET /api/showrooms`
- `GET /api/vouchers/available`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/login`

Ghi chu:

- Cac file backup, `.env`, log, `bin`, `obj` khong duoc dua vao commit.
- Neu sau nay muon tiep tuc lam dep them, co the lam them mot dot rieng cho cac controller/report/admin rat lon, nhung dot refactor theo plan nay da hoan thanh muc tieu chinh: BE de doc hon, giu contract voi FE, build/test/runtime pass.
