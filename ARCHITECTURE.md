# Kiến trúc MoToSale/XeMoto (v2) — bản đồ để đọc & giải thích code

Tài liệu này mô tả code đi từ **DB → giao diện** để dễ trình bày khi bảo vệ đồ án.

## 1. Tổng quan
- **Backend**: .NET 8, kiến trúc nhiều lớp, chia thành các microservice nhỏ qua API Gateway (Ocelot).
- **Frontend**: React + Vite — `frontend-admin` (trang quản trị) và `frontend-store` (trang bán hàng).
- **CSDL**: SQL Server, EF Core code‑first (tự migrate + seed khi khởi động).

```
[frontend-store]  ─┐
                   ├─▶  ApiGateway :5100  ─▶  AuthService :5101 (đăng nhập, tài khoản)
[frontend-admin]  ─┘                       └▶  APIService  :5102 (nghiệp vụ chính)
                                                     │
                                                     ▼
                                              SQL Server (DB MoToSaleV2)
```

## 2. Luồng 1 request (backend) — 5 lớp
```
HTTP request
   ▼
Controller   (MoToSale.APIService/Controllers)   → nhận request, kiểm tra quyền, trả response
   ▼
Service      (MoToSale.Services/<Domain>)        → logic nghiệp vụ (validate, transaction)
   ▼
Repository   (MoToSale.Repository)               → truy vấn DB (generic Repository<T> + repo cụ thể)
   ▼
DbContext    (MoToSale.Repository/AppDbContext)  → EF Core ánh xạ entity ↔ bảng
   ▼
Entity       (MoToSale.Entities)                 → lớp dữ liệu (kế thừa BaseEntity)
```
- **DTO** (`MoToSale.DTO`) là hợp đồng dữ liệu vào/ra (dùng `record`), tách khỏi Entity.
- **Envelope phản hồi chuẩn** (controller luôn trả 1 trong các kiểu này):
  - `IdResponse { Id }` — sau khi tạo/sửa/duyệt.
  - `MessageResponse { Message }` — báo lỗi nghiệp vụ (kèm `BadRequest`) hoặc thông báo.
  - `ItemsResponse<T> { Items }` — danh sách không phân trang.
  - `PagingResponse<T> { Items, Page, PageSize, TotalItems, TotalPages }` — danh sách có phân trang.
- **Xử lý lỗi**: service ném exception nghiệp vụ riêng (vd `CatalogException`, `OrderException`); controller `try/catch` → `BadRequest(MessageResponse)`.

## 3. Tầng DB
- `AppDbContext` là `partial class`; **cấu hình entity** (khóa, ràng buộc, CHECK constraint) đặt riêng ở `MoToSale.Repository/Configurations`.
- Một số bảng có **CHECK constraint** để bảo đảm toàn vẹn ngay ở DB, ví dụ:
  - `CK_InventoryItems_Quantities`: `OnHand >= 0 AND Reserved >= 0 AND Reserved <= OnHand`.
  - `CK_Orders_Amounts`: các khoản tiền `>= 0`.
- **Migration**: thư mục `MoToSale.Repository/Migrations`. Khi APIService khởi động: `db.Database.MigrateAsync()` + seed dữ liệu mẫu (`SeedConfiguration`).
- **Repository generic** `Repository<T>` cung cấp CRUD dùng chung; repo cụ thể (vd `OrderRepository`) kế thừa và thêm truy vấn theo nghiệp vụ.

## 4. Các file `partial` (logic 1 class chia nhiều file — biết để tìm nhanh)
| Class | File | Chứa gì |
|---|---|---|
| `OrderService` | `OrderService.cs` | hằng số, ctor, **bản đồ trạng thái đơn** |
| | `OrderService.Checkout.cs` | khách đặt đơn online (giữ chỗ tồn) |
| | `OrderService.Pos.cs` | bán tại quầy: bán đứt / đặt cọc / trả góp |
| | `OrderService.QueryAllocationFulfillment.cs` | tra cứu, soạn/xuất kho, giao hàng, hủy, đổi trạng thái |
| `PaymentService` | `PaymentService.cs`, `PaymentService.RecordAndQuery.cs` | thu/xác nhận/hoàn tiền (chỉ đổi PaymentStatus) |
| `ContentController` | `.Banners / .Faqs / .Contacts / .Posts` | quản lý nội dung trang chủ |
| `ContentService` | `.Contacts` (+ các phần khác) | logic nội dung |
| `AppDbContext` | (+ cấu hình ở `Configurations`) | DbSet + override SaveChanges (tự đóng dấu thời gian) |

> **`BusinessOperationsService`** gom nhiều nghiệp vụ vận hành trong một service (để 1 chỗ dễ tra): **cung ứng** (nhà cung cấp, đơn mua, nhận hàng, thanh toán NCC), **sửa chữa** (phiếu + xuất phụ tùng), **CSKH** (chăm sóc khách), **sổ quỹ** (thu/chi/đảo phiếu), **chấm công/ca**. Mỗi nhóm là một cụm method tách bằng comment vùng — khi cần chỉ tìm theo tên nghiệp vụ.

## 5. Mô hình trạng thái đơn (2 trục độc lập)
Xem chi tiết trong comment đầu `MoToSale.Services/Ordering/OrderService.cs`. Tóm tắt:
- **OrderStatus** (giao hàng): `Pending → Shipping → Delivered` hoặc `→ Cancelled`.
- **PaymentStatus** (tiền): `Unpaid → PendingConfirmation → Paid`; `→ Refunded` (hoàn tiền khi hủy/đổi trả); `→ Failed` (CK không hoàn tất).
- Hai trục **không tự kéo theo nhau**: thu tiền không tự chuyển đơn sang Đang giao; admin chủ động duyệt giao.

## 6. Frontend (cấu trúc 3 lớp)
```
Page (src/pages/...)        → màn hình, state, gọi service
Service (src/services/...)  → gọi API (axios), 1 file 1 nhóm nghiệp vụ
http (api.js / httpClient)  → cấu hình baseURL, gắn token, interceptor
```
- **Quy ước field**: FE dùng **đúng tên tiếng Anh như DTO của BE** (vd banner: `position/title/imageUrl/sortOrder/status`; FAQ: `question/answer/category/sortOrder/status`). `status` kiểu số: `1` = hiển thị/hoạt động, `0` = ẩn; trên form dùng biến `isActive` (boolean) rồi quy đổi.
- **Phân quyền FE**: route bọc `ProtectedRoute`; menu/nút theo vai trò (`isAdmin()`), nhưng quyền thật vẫn do BE kiểm (`[Authorize(Roles=...)]`).

> **Lưu ý lớp "adapter" của `frontend-store`**: store có thêm `normalizers.js` (mapOrder/mapVoucher/normalizeProduct…) — đây là lớp adapter **có chủ đích**: store được dựng lại từ giao diện cũ nên cần chuẩn hóa dữ liệu BE về một shape ổn định cho UI. Khác với `frontend-admin` (trước đây map cả tên tiếng Việt lẫn Anh một cách thừa — đã được dọn để dùng đúng tên tiếng Anh của DTO). Vì store gom toàn bộ việc map vào MỘT chỗ (`normalizers.js`) nên vẫn rõ ràng, dễ giải thích; không cần (và không nên) phá lớp này.

## 7. Đăng nhập & phân quyền
- JWT (AuthService cấp token). APIService cấu hình `JwtBearer` validate issuer/audience/lifetime/key.
- Vai trò: `Admin`, `Staff`, `Customer`. Controller gắn `[Authorize(Roles = "...")]`; tài chính/cấu hình/xóa thường chỉ `Admin`.

## 8. Triển khai
- 1 repo deploy (`xemoto`, gốc = `v2`), Docker Compose: `mssql, auth, api, gateway, admin, store`.
- Chi tiết: `DEPLOY_VPS_NGINX_GUIDE.md`, `REDEPLOY_AFTER_CODE_CHANGE.md`, `SETUP_AUTO_DEPLOY.md`.
