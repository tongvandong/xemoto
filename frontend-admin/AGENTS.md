# FrontendAdmin — Agent Instructions & Phân công

## Tổng quan

File này định nghĩa cách chia công việc xây dựng FrontendAdmin thành các agent độc lập. Mỗi agent chịu trách nhiệm một nhóm module, có thể triển khai song song sau khi Agent 1 hoàn thành foundation.

**Source of truth**: `SPEC.md` — mọi agent phải đọc SPEC.md trước khi code.

---

## Agent 1: Foundation & Core

### Phạm vi
- Scaffold project (package.json, vite.config.js, index.html)
- Cài dependencies (react, react-dom, react-router-dom, axios, bootstrap, adminlte, font-awesome)
- `src/main.jsx` — entry point
- `src/App.jsx` — routing setup cho tất cả pages
- `src/components/MainLayout.jsx` — sidebar + navbar + footer + content wrapper
- `src/components/Sidebar.jsx` — menu navigation đầy đủ 15 modules
- `src/components/Navbar.jsx` — top bar (user info, logout)
- `src/components/Footer.jsx`
- `src/components/ProtectedRoute.jsx` — auth guard
- `src/contexts/AuthContext.jsx` — JWT auth state management
- `src/services/api.js` — axios instance, interceptors, token injection
- `src/services/authService.js` — login/logout API calls
- `src/pages/Login.jsx` — trang đăng nhập
- `src/pages/Dashboard.jsx` — placeholder (stat cards cơ bản)
- `src/utils/formatCurrency.js`, `formatDate.js`, `constants.js`

### Output mong đợi
- Có thể `npm run dev` → mở browser → thấy trang Login
- Login thành công → redirect Dashboard với sidebar đầy đủ menu
- Click menu → navigate đúng route (trang placeholder "Coming soon" cho các module chưa làm)

### Quy tắc
- Port dev server: 5175
- Proxy `/api` → `http://localhost:5000`
- Sidebar menu items phải đầy đủ theo SPEC (15 modules)
- Giao diện AdminLTE dark sidebar, light navbar (giống BaseCore.WebClient)

---

## Agent 2: Catalog Management

### Phạm vi
- `src/pages/products/ProductList.jsx` — CRUD sản phẩm (table + search + filter danh mục/hãng/trạng thái + pagination)
- `src/pages/products/ProductForm.jsx` — form thêm/sửa sản phẩm (modal hoặc page)
- `src/pages/products/VariantManager.jsx` — quản lý biến thể trong sản phẩm
- `src/pages/products/ImageManager.jsx` — quản lý ảnh sản phẩm
- `src/pages/categories/CategoryList.jsx` — CRUD danh mục
- `src/pages/brands/BrandList.jsx` — CRUD hãng xe
- `src/pages/brands/VehicleModelList.jsx` — CRUD dòng xe (thuộc hãng)
- `src/pages/showrooms/ShowroomList.jsx` — CRUD showroom
- `src/services/productService.js`
- `src/services/categoryService.js`
- `src/services/brandService.js`
- `src/services/showroomService.js`

### API Endpoints sử dụng
- `GET/POST/PATCH /api/products`, `/api/products/{id}`
- `GET /api/categories`, `/api/categories/{id}`
- (Cần bổ sung admin endpoints cho brands, models, showrooms nếu backend chưa có)

### Quy tắc
- Reuse component pattern từ BaseCore.WebClient (table + modal)
- Format giá: VND (dùng `formatCurrency`)
- Ảnh: hiển thị thumbnail trong table, full trong form
- Biến thể: inline table trong form sản phẩm

---

## Agent 3: Order & Payment & Voucher

### Phạm vi
- `src/pages/orders/OrderList.jsx` — danh sách đơn hàng (filter trạng thái, ngày, loại)
- `src/pages/orders/OrderDetail.jsx` — chi tiết đơn (thông tin khách, items, thanh toán, voucher, tồn kho giữ chỗ)
- `src/pages/payments/PaymentList.jsx` — danh sách thanh toán (filter trạng thái, phương thức)
- `src/pages/vouchers/VoucherList.jsx` — CRUD voucher + phạm vi áp dụng
- `src/pages/inventory/InventoryView.jsx` — xem tồn kho + giữ chỗ + đồng bộ
- `src/services/orderService.js`
- `src/services/paymentService.js`
- `src/services/voucherService.js`

### API Endpoints sử dụng
- `GET/POST/PUT /api/orders`, `/api/orders/{id}`
- `GET/POST/PATCH/DELETE /api/payments`, `/api/payments/{id}`
- `GET/POST /api/vouchers`, `/api/vouchers/{id}`

### Quy tắc
- Đơn hàng: hiển thị badge màu theo trạng thái (Pending=warning, Paid=success, Cancelled=danger...)
- Thanh toán: phương thức hiển thị icon (COD, BankTransfer, Momo, VNPay)
- Voucher: form phức tạp (loại giảm, phạm vi, thời hạn, giới hạn)
- Tồn kho: read-only view + nút "Đồng bộ tồn kho"
- Format tiền: VND
- Format ngày: dd/MM/yyyy HH:mm

---

## Agent 4: User & Content Management

### Phạm vi
- `src/pages/users/UserList.jsx` — CRUD user + phân quyền role
- `src/pages/reviews/ReviewList.jsx` — duyệt/ẩn/xóa đánh giá
- `src/pages/posts/PostList.jsx` — CRUD bài viết
- `src/pages/faq/FaqList.jsx` — CRUD FAQ
- `src/pages/contacts/ContactList.jsx` — xem + xử lý liên hệ
- `src/services/userService.js`
- `src/services/reviewService.js`
- `src/services/postService.js`
- `src/services/faqService.js`
- `src/services/contactService.js`

### API Endpoints sử dụng
- `GET/POST/PUT/PATCH/DELETE /api/users/*`
- `GET/PATCH /api/reviews/*`
- `GET/POST /api/content/*`
- (FAQ, Contact: cần bổ sung admin endpoints nếu chưa có)

### Quy tắc
- User: hiển thị role bằng badge, trạng thái bằng switch/badge
- Đánh giá: hiển thị sao (1-5), nội dung truncate, nút duyệt/ẩn
- Bài viết: rich text editor (hoặc textarea đơn giản ban đầu)
- FAQ: drag-drop thứ tự (hoặc input số thứ tự)
- Liên hệ: read-only + nút "Đánh dấu đã xử lý"

---

## Agent 5: Dashboard & Reports

### Phạm vi
- `src/pages/Dashboard.jsx` — hoàn thiện (stat cards + charts + recent orders + top products)
- `src/pages/reports/ReportsPage.jsx` — trang báo cáo chi tiết
- `src/components/StatCard.jsx` — reusable stat box
- `src/components/charts/RevenueChart.jsx` — biểu đồ doanh thu
- `src/components/charts/OrderStatusChart.jsx` — pie chart trạng thái đơn
- `src/services/reportService.js`

### API Endpoints sử dụng
- Tổng hợp từ nhiều service:
  - `GET /api/products` (count)
  - `GET /api/orders` (count, filter by date)
  - `GET /api/payments` (sum by date range)
  - `GET /api/users/me` hoặc count users
- (Có thể cần thêm admin report endpoints ở backend)

### Quy tắc
- Chart library: Chart.js hoặc recharts (chọn 1, ưu tiên nhẹ)
- Dashboard load nhanh: parallel API calls
- Responsive charts
- Stat cards: 4 cards trên 1 row (giống AdminLTE small-box pattern)
- Báo cáo: cho phép chọn khoảng thời gian (date range picker)

---

## Thứ tự triển khai

```
Agent 1 (Foundation)
    ↓ hoàn thành
Agent 2 (Catalog) ─┐
Agent 3 (Order)  ──┼── song song
Agent 4 (Content) ─┘
    ↓ tất cả hoàn thành
Agent 5 (Dashboard & Reports)
```

## Quy tắc chung cho TẤT CẢ agents

1. **Đọc SPEC.md** trước khi bắt đầu code.
2. **Không sửa file của agent khác** trừ khi thêm route vào App.jsx (Agent 1 đã setup sẵn).
3. **Giao diện tiếng Việt**: label, button, placeholder, message đều tiếng Việt.
4. **Pattern nhất quán**:
   - Table: `table table-bordered table-striped`
   - Card: `card` > `card-header` > `card-body`
   - Content: `content-wrapper` > `content-header` > `section.content`
   - Modal: Bootstrap 4 modal pattern
   - Pagination: Bootstrap 4 pagination
5. **Error handling**: try/catch, hiển thị alert/toast khi lỗi.
6. **Loading**: spinner khi fetch.
7. **Confirm trước xóa**: `window.confirm()` hoặc modal confirm.
8. **Không thêm dependency mới** ngoài danh sách trong SPEC trừ khi thật sự cần và ghi chú lý do.
9. **Giữ code đơn giản**: không over-engineer, không abstract quá sớm.
10. **Mỗi service file** export object với các method (getAll, getById, create, update, delete...).

## Backend API chưa có

Một số chức năng admin có thể cần API mới ở backend (ví dụ: admin CRUD brands, admin update order status, admin report endpoints). Khi gặp trường hợp này:

1. Tạo service call với endpoint dự kiến (ví dụ `GET /api/admin/brands`)
2. Ghi chú trong code: `// TODO: Backend cần bổ sung endpoint này`
3. UI vẫn hoạt động được (hiển thị empty state hoặc mock data tạm)
4. Sau khi frontend xong, sẽ bổ sung backend endpoints tương ứng

## Verification

Sau khi hoàn thành mỗi agent:
1. `npm run build` phải pass (không lỗi)
2. `npm run dev` → mở browser → trang hoạt động đúng
3. Không có console error
4. Responsive: sidebar collapse trên mobile
