# V2 Study Plan

## Mục tiêu
Tài liệu này giúp bạn học hệ thống `v2` theo thứ tự hợp lý, từ tổng quan đến chi tiết, tập trung vào:
- `v2/backend`: backend trong dự án mới
- `v2/frontend-admin`: frontend admin app

---

## 1. Tổng quan thư mục `v2`
- `v2/backend`: .NET solution với các project:
  - `MoToSale.ApiGateway`
  - `MoToSale.APIService`
  - `MoToSale.AuthService`
  - `MoToSale.Common`
  - `MoToSale.DTO`
  - `MoToSale.Entities`
  - `MoToSale.Repository`
  - `MoToSale.Services`
- `v2/frontend-admin`: admin frontend React/Vite app.

---

## 2. Phase 0 — Mở nhanh toàn bộ cấu trúc
1. `v2/backend/src/MoToSale.ApiGateway`
2. `v2/backend/src/MoToSale.APIService`
3. `v2/backend/src/MoToSale.AuthService`
4. `v2/backend/src/MoToSale.Common`
5. `v2/backend/src/MoToSale.DTO`
6. `v2/backend/src/MoToSale.Entities`
7. `v2/backend/src/MoToSale.Repository`
8. `v2/backend/src/MoToSale.Services`
9. `v2/frontend-admin/package.json`
10. `v2/frontend-admin/src/App.jsx` và `v2/frontend-admin/src/pages`

---

## 3. Phase 1 — Hiểu backend V2 trước
### 3.1. `MoToSale.ApiGateway`
- Mở:
  - `Program.cs`
  - `ocelot.json`
  - `appsettings.json` / `appsettings.Development.json`
- Mục đích: gateway chuyển request từ frontend tới các service nội bộ.
- Học:
  - cách cấu hình Ocelot
  - các route proxy
  - CORS/Swagger (nếu có)

### 3.2. `MoToSale.AuthService`
- Mở:
  - `Program.cs`
  - `Controllers/`
  - `appsettings.json`
- Mục đích: auth, đăng nhập, token, thông tin user.
- Học:
  - cách service thực hiện auth
  - các endpoint auth và users
  - cơ chế JWT nếu dùng

### 3.3. `MoToSale.APIService`
- Mở:
  - `Program.cs`
  - `Controllers/`
  - `Services/`
- Mục đích: core API business logic.
- Học:
  - các controller chính, model DTO đầu vào/ra
  - cách gọi service/repository

### 3.4. Các project shared
- `MoToSale.Common`: cấu hình chung, helpers, enums, base entity.
- `MoToSale.DTO`: lớp dữ liệu dùng chung giữa client và service.
- `MoToSale.Entities`: entity định nghĩa DB.
- `MoToSale.Repository`: EF context, repository, seed data.
- `MoToSale.Services`: logic nghiệp vụ.

---

## 4. Phase 2 — Mở theo luồng request backend
### 4.1. Luồng auth
1. `ApiGateway` route tới `AuthService`
2. `AuthService/Controllers` xử lý login/register
3. `AuthService` trả token và middleware xác thực

### 4.2. Luồng dữ liệu chính
1. Frontend gọi `ApiGateway`
2. `ApiGateway` proxy đến `APIService`
3. `APIService` gọi `Services` và `Repository`
4. `Repository` truy vấn `Entities` qua `AppDbContext`

### 4.3. Luồng order/payment (nếu có trong APIService)
- Tra cứu `Services/Ordering`, `Services/Payments`, `Entities/Ordering`, `Entities/Payments`.

---

## 5. Phase 3 — Chi tiết backend V2
### 5.1. `MoToSale.ApiGateway`
- Các file quan trọng:
  - `Program.cs`
  - `ocelot.json`
  - `appsettings*.json`
- Chép tay:
  - `builder.Configuration` và các routes proxy.

### 5.2. `MoToSale.AuthService`
- Các file quan trọng:
  - `Program.cs`
  - `Controllers/*.cs`
- Chép tay:
  - endpoint auth
  - logic token/user

### 5.3. `MoToSale.APIService`
- Các file quan trọng:
  - `Program.cs`
  - `Controllers/*`
  - `Models/*`
  - `Services/*`
- Chép tay:
  - CRUD/flow chính
  - cách service kết nối repository

### 5.4. Shared libs
- `MoToSale.Common/AppSettings.cs`
- `MoToSale.DTO/*`
- `MoToSale.Entities/*`
- `MoToSale.Repository/AppDbContext.cs`
- `MoToSale.Services/*`
- Chép tay các class dùng chung trong request/response và entity mapping.

---

## 6. Phase 4 — Học frontend admin
### 6.1. Cấu trúc chính
- `v2/frontend-admin/package.json`
- `v2/frontend-admin/vite.config.js`
- `v2/frontend-admin/src/main.jsx`
- `v2/frontend-admin/src/App.jsx`
- `v2/frontend-admin/src/pages/`
- `v2/frontend-admin/src/services/`

### 6.2. Luồng page
- Xem `pages/` để hiểu các view admin.
- Xem `services/` để hiểu API endpoints frontend gọi.
- Xem `contexts/` nếu dùng auth/session.

### 6.3. Chép tay frontend
- Ghi tay `App.jsx` và một page quan trọng.
- Ghi tay 1 service fetch API.

---

## 7. Phase 5 — Dev và chạy thử
1. Kiểm tra các log file `*.out.log`, `*.err.log` nếu cần.
2. Chạy backend solution:
   - `v2/backend/MoToSale.slnx` hoặc `dotnet run` từng project.
3. Chạy frontend:
   - `cd v2/frontend-admin`
   - `npm install`
   - `npm run dev`
4. Mở browser và thử gọi endpoint.

---

## 8. Checklist chép tay theo luồng
1. `v2/backend/src/MoToSale.ApiGateway/Program.cs`
2. `v2/backend/src/MoToSale.ApiGateway/ocelot.json`
3. `v2/backend/src/MoToSale.AuthService/Program.cs`
4. `v2/backend/src/MoToSale.AuthService/Controllers/*.cs`
5. `v2/backend/src/MoToSale.APIService/Program.cs`
6. `v2/backend/src/MoToSale.APIService/Controllers/*.cs`
7. `v2/backend/src/MoToSale.APIService/Services/*.cs`
8. `v2/backend/src/MoToSale.Repository/AppDbContext.cs`
9. `v2/backend/src/MoToSale.Entities/Operations`, `Ordering`, `Payments`
10. `v2/frontend-admin/src/App.jsx`
11. `v2/frontend-admin/src/pages/*`
12. `v2/frontend-admin/src/services/*`

---

## 9. Gợi ý học nhanh
- Nếu bạn muốn học theo luồng, bắt đầu từ `ApiGateway` rồi qua `AuthService`, rồi `APIService`.
- Nếu bạn muốn học theo module, mở `Common`/`DTO`/`Entities` trước để hiểu dữ liệu chung.
- Nếu bạn muốn học frontend, mở `src/services` để thấy endpoint admin đang dùng.

---

## 10. Lời khuyên
- Học bằng cách chép tay từng file quan trọng; sau đó mở lại file để kiểm tra.
- Viết sơ đồ flow request ngắn gọn.
- Nếu cần, tôi có thể tạo thêm `v2/StudyChecklist.md` với checklist chi tiết từng file và câu hỏi.
