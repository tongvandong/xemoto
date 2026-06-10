# FrontendAdmin — Spec tổng thể

## Mục tiêu

Xây dựng giao diện quản trị (Admin Panel) cho hệ thống Showroom xe máy MoToSale, cho phép admin thực hiện đầy đủ các thao tác quản lý thực tế: thêm, sửa, xóa, quản lý trạng thái, báo cáo, thống kê.

## Giao diện tham chiếu

Bắt chước **layout và UI pattern** từ `BaseCore.WebClient`:
- AdminLTE 3 + Bootstrap 4 + Font Awesome 6
- Sidebar trái (dark theme) + Top navbar + Content wrapper + Footer
- CRUD pattern: Table (search + filter + pagination) + Modal form (Add/Edit)
- Responsive (desktop + tablet)

**Chỉ bắt chước giao diện, KHÔNG bắt chước nội dung** — nội dung phải phản ánh đúng hệ thống MoToSale (xe máy, phụ tùng, showroom, voucher...).

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | React 18 |
| Build tool | Vite 5 |
| UI Framework | Bootstrap 4.6 + AdminLTE 3.2 |
| Icons | Font Awesome 6 |
| HTTP Client | Axios |
| Routing | React Router DOM 7 |
| State | React Context + useState/useEffect |
| Charts | Chart.js (hoặc recharts) cho báo cáo |

## Backend API

Tất cả request đi qua API Gateway: `http://localhost:5000`

| Service | Port | Endpoints |
|---------|------|-----------|
| ApiGateway | 5000 | Proxy tất cả |
| AuthService | 5001 | `/api/auth/*`, `/api/users/*` |
| CatalogService | 5002 | `/api/products/*`, `/api/categories/*`, `/api/showrooms/*`, `/api/reviews/*`, `/api/content/*`, `/api/favorites/*` |
| OrderService | 5003 | `/api/cart/*`, `/api/orders/*`, `/api/vouchers/*` |
| PaymentService | 5004 | `/api/payments/*` |

## Database (ShowroomDB)

30 bảng chính, bao gồm:
- NGUOIDUNG, VAITRO, NGUOIDUNG_VAITRO, NGUOIDUNG_DIACHI
- SANPHAM, BIENSANPHAM, ANHSANPHAM, DANHMUC, HANGXE, DONGXE
- SHOWROOM, PHUTUNG_TUONGTHICH
- DONHANG, CHITIET_DONHANG, GIOHANG, CHITIET_GIOHANG
- THANHTOAN, TONKHO_GIUCHO
- VOUCHER, VOUCHER_DANHMUC, VOUCHER_HANGXE, VOUCHER_SANPHAM, VOUCHER_NGUOIDUNG, DONHANG_VOUCHER
- DANHGIASANPHAM, BAIVIET, FAQ, LIENHE_YEUCAU, YEUTHICH

## Các module/trang cần xây dựng

### 1. Login
- Form đăng nhập (email + password)
- JWT token lưu localStorage
- Redirect về Dashboard sau login

### 2. Dashboard
- Stat cards: Tổng sản phẩm, Tổng đơn hàng, Doanh thu tháng, User mới
- Biểu đồ doanh thu 7 ngày gần nhất
- Đơn hàng mới nhất (5 đơn)
- Top 5 sản phẩm bán chạy

### 3. Quản lý Sản phẩm
- Danh sách: table + search + filter (danh mục, hãng xe, trạng thái) + pagination
- Thêm/Sửa: form modal hoặc trang riêng (tên, mã, giá, mô tả, danh mục, hãng, dòng, showroom, ảnh, trạng thái)
- Quản lý biến thể (BIENSANPHAM): màu sắc, phiên bản, SKU, giá ghi đè, tồn kho
- Quản lý ảnh sản phẩm (ANHSANPHAM): upload/URL, ảnh chính, thứ tự

### 4. Quản lý Danh mục
- CRUD danh mục (hỗ trợ danh mục cha)
- Hiển thị dạng cây hoặc table phẳng

### 5. Quản lý Hãng xe & Dòng xe
- CRUD HANGXE (tên, slug, logo, trạng thái)
- CRUD DONGXE (thuộc hãng, tên, slug, trạng thái)

### 6. Quản lý Showroom
- CRUD SHOWROOM (tên, địa chỉ, SĐT, email, giờ mở cửa, trạng thái)

### 7. Quản lý Đơn hàng
- Danh sách đơn: filter theo trạng thái, ngày, loại đơn
- Chi tiết đơn: thông tin khách, sản phẩm, thanh toán, voucher, tồn kho giữ chỗ
- Cập nhật trạng thái đơn hàng + vận chuyển
- Hủy đơn (có lý do)

### 8. Quản lý Thanh toán
- Danh sách thanh toán: filter theo trạng thái, phương thức
- Xác nhận thanh toán / Hủy thanh toán

### 9. Quản lý Voucher
- CRUD voucher (mã, loại giảm, giá trị, thời hạn, giới hạn, phạm vi áp dụng)
- Gán voucher cho danh mục / hãng xe / sản phẩm cụ thể
- Xem lịch sử sử dụng voucher

### 10. Quản lý Tồn kho
- Xem tồn kho theo sản phẩm / biến thể (view v_TONKHO_KHADUNG)
- Xem danh sách giữ chỗ đang active
- Đồng bộ tồn kho (gọi SP sp_SANPHAM_DongBoTatCaSoLuongTon)

### 11. Quản lý Người dùng
- Danh sách user: search + filter trạng thái + pagination
- Thêm/Sửa user (họ tên, email, SĐT, mật khẩu, trạng thái)
- Phân quyền role (Admin, Staff, Customer)
- Xem địa chỉ user

### 12. Quản lý Đánh giá
- Danh sách đánh giá: filter theo sản phẩm, trạng thái, điểm
- Duyệt / Ẩn / Xóa đánh giá

### 13. Quản lý Bài viết
- CRUD bài viết (tiêu đề, slug, nội dung, ảnh đại diện, danh mục, trạng thái xuất bản)

### 14. Quản lý FAQ
- CRUD FAQ (câu hỏi, câu trả lời, danh mục, thứ tự, trạng thái)

### 15. Quản lý Liên hệ
- Danh sách yêu cầu liên hệ: filter theo trạng thái, loại
- Xem chi tiết + Đánh dấu đã xử lý

### 16. Báo cáo & Thống kê
- Doanh thu theo ngày/tuần/tháng (line chart)
- Top sản phẩm bán chạy (bar chart)
- Đơn hàng theo trạng thái (pie chart)
- Thống kê user mới theo tháng

## Cấu trúc thư mục dự kiến

```
FrontendAdmin/
├── index.html
├── package.json
├── vite.config.js
├── SPEC.md
├── AGENTS.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── MainLayout.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── Sidebar.jsx
    │   ├── Navbar.jsx
    │   ├── Footer.jsx
    │   ├── DataTable.jsx          (reusable table + pagination)
    │   ├── ModalForm.jsx          (reusable modal wrapper)
    │   ├── StatCard.jsx           (dashboard stat box)
    │   └── charts/
    │       ├── RevenueChart.jsx
    │       └── OrderStatusChart.jsx
    ├── contexts/
    │   └── AuthContext.jsx
    ├── pages/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── products/
    │   │   ├── ProductList.jsx
    │   │   ├── ProductForm.jsx
    │   │   ├── VariantManager.jsx
    │   │   └── ImageManager.jsx
    │   ├── categories/
    │   │   └── CategoryList.jsx
    │   ├── brands/
    │   │   ├── BrandList.jsx
    │   │   └── VehicleModelList.jsx
    │   ├── showrooms/
    │   │   └── ShowroomList.jsx
    │   ├── orders/
    │   │   ├── OrderList.jsx
    │   │   └── OrderDetail.jsx
    │   ├── payments/
    │   │   └── PaymentList.jsx
    │   ├── vouchers/
    │   │   └── VoucherList.jsx
    │   ├── inventory/
    │   │   └── InventoryView.jsx
    │   ├── users/
    │   │   └── UserList.jsx
    │   ├── reviews/
    │   │   └── ReviewList.jsx
    │   ├── posts/
    │   │   └── PostList.jsx
    │   ├── faq/
    │   │   └── FaqList.jsx
    │   ├── contacts/
    │   │   └── ContactList.jsx
    │   └── reports/
    │       └── ReportsPage.jsx
    ├── services/
    │   ├── api.js                 (axios instance + interceptors)
    │   ├── authService.js
    │   ├── productService.js
    │   ├── categoryService.js
    │   ├── brandService.js
    │   ├── showroomService.js
    │   ├── orderService.js
    │   ├── paymentService.js
    │   ├── voucherService.js
    │   ├── userService.js
    │   ├── reviewService.js
    │   ├── postService.js
    │   ├── faqService.js
    │   ├── contactService.js
    │   └── reportService.js
    └── utils/
        ├── formatCurrency.js
        ├── formatDate.js
        └── constants.js
```

## Quy tắc chung

1. **Ngôn ngữ giao diện**: Tiếng Việt (label, button, message)
2. **Responsive**: Desktop-first, hỗ trợ tablet (sidebar collapse)
3. **Error handling**: Toast/alert cho lỗi API, validation form trước submit
4. **Loading states**: Spinner khi fetch data
5. **Confirmation**: Confirm dialog trước khi xóa
6. **Auth guard**: Mọi trang (trừ Login) phải qua ProtectedRoute
7. **Role-based**: Một số trang chỉ Admin mới truy cập được

## Vite Dev Server

- Port: `5175` (tránh conflict với Frontend user ở 5174)
- Proxy `/api` → `http://localhost:5000`

## Phân chia Agent triển khai

Xem file `AGENTS.md` để biết chi tiết phân công.
