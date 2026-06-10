# Kế hoạch ôn thi 4 ngày - Backend và Frontend Admin

## Mục tiêu ôn thi

Bạn **đảm nhiệm cả Backend và Frontend Admin**, nên trọng tâm ôn là:

- Hiểu luồng và code của `frontend-admin`.
- Hiểu kiến trúc backend: Controller, Service, Repository, DTO, Entity, DbContext.
- Giải thích được admin gọi API như thế nào.
- Biết tự lần luồng từ admin page xuống database.
- Có thể code lại một đoạn nhỏ nếu bị xoá.
- Có thể thêm một chức năng nhỏ gồm cả frontend admin và backend nếu cần.

Luồng bắt buộc phải nắm:

```text
Admin Page
-> admin service JS
-> api.js / axios
-> API Gateway
-> Backend Controller
-> Backend Service
-> Repository / DbContext
-> Entity / DTO
```

Không cần ôn sâu `frontend-store`, chỉ cần biết nó là trang khách hàng.

## Phạm vi chính của bạn

| Nhóm | Cần nắm sâu? | Ghi chú |
|---|---:|---|
| `frontend-admin` | Có | Phần bạn phụ trách chính ở frontend |
| Backend controller/service/DTO/entity/repository | Có | Phần bạn phụ trách chính ở backend |
| `frontend-store` | Không sâu | Chỉ cần biết vai trò tổng quát |
| Docker/deploy | Cơ bản | Biết chạy hệ thống, không cần quá sâu |

## Ngày 1 - Tổng quan Admin, đăng nhập, phân quyền

Mục tiêu:

- Hiểu admin app khởi động từ đâu.
- Hiểu route admin được bảo vệ như thế nào.
- Hiểu login, JWT, localStorage, axios interceptor.
- Hiểu backend AuthService xử lý login ra sao, gồm controller, service, DTO, repository và tạo JWT.

File admin cần đọc:

- `frontend-admin/src/App.jsx`
- `frontend-admin/src/pages/Login.jsx`
- `frontend-admin/src/contexts/AuthContext.jsx`
- `frontend-admin/src/components/ProtectedRoute.jsx`
- `frontend-admin/src/components/MainLayout.jsx`
- `frontend-admin/src/components/Navbar.jsx`
- `frontend-admin/src/components/Sidebar.jsx`
- `frontend-admin/src/services/api.js`
- `frontend-admin/src/services/authService.js`

File backend cần hiểu:

- `backend/src/MoToSale.ApiGateway/ocelot.json`
- `backend/src/MoToSale.AuthService/Controllers/AuthController.cs`
- `backend/src/MoToSale.Services/Identity/AuthService.cs`
- `backend/src/MoToSale.DTO/Auth/AuthDtos.cs`

Luồng phải vẽ được:

```text
Login.jsx
-> AuthContext.login()
-> authService.login()
-> api.post('/auth/login')
-> /api/auth/login
-> API Gateway
-> AuthController.Login()
-> AuthService.LoginAsync()
-> kiểm tra email/mật khẩu
-> tạo JWT
-> trả token + user
-> lưu admin_token/admin_user
-> ProtectedRoute cho vào Dashboard
```

Câu hỏi phải trả lời được:

- Admin app khai báo route ở đâu?
- `AuthProvider` bọc app để làm gì?
- `ProtectedRoute` chặn route thế nào?
- Token được lưu ở đâu?
- Axios tự gắn token ở đâu?
- Nếu backend trả `401` thì frontend làm gì?
- Route nào chỉ Admin vào được?
- API Gateway chuyển `/api/auth/login` đi đâu?

Bài tập code:

- Code lại `ProtectedRoute` bản đơn giản.
- Code lại interceptor gắn token trong `api.js`.
- Thêm hiển thị email user trong `Navbar`.

Kết quả cuối ngày:

- Nói được luồng login admin trong 2 phút.
- Code lại được phần route protection cơ bản.

## Ngày 2 - CRUD Admin: sản phẩm, danh mục, hãng

Mục tiêu:

- Hiểu cấu trúc một trang quản trị dạng danh sách + form + modal.
- Hiểu frontend admin gọi backend để lấy/thêm/sửa/xoá dữ liệu.
- Hiểu DTO/entity/service backend liên quan sản phẩm.

File admin cần đọc:

- `frontend-admin/src/pages/products/ProductList.jsx`
- `frontend-admin/src/pages/products/ProductForm.jsx`
- `frontend-admin/src/pages/categories/CategoryList.jsx`
- `frontend-admin/src/pages/brands/BrandList.jsx`
- `frontend-admin/src/pages/manufacturers/ManufacturerList.jsx`
- `frontend-admin/src/services/productService.js`
- `frontend-admin/src/services/categoryService.js`
- `frontend-admin/src/services/brandService.js`
- `frontend-admin/src/services/manufacturerService.js`
- `frontend-admin/src/components/ui/Button.jsx`
- `frontend-admin/src/components/ui/DataTable.jsx`
- `frontend-admin/src/components/ui/Modal.jsx`

File backend cần hiểu:

- `backend/src/MoToSale.APIService/Controllers/ProductsController.cs`
- `backend/src/MoToSale.Services/Catalog/CatalogService.cs`
- `backend/src/MoToSale.Repository/Catalog/ProductRepository.cs`
- `backend/src/MoToSale.DTO/Catalog/CatalogDtos.cs`
- `backend/src/MoToSale.Entities/Catalog/Product.cs`
- `backend/src/MoToSale.Repository/AppDbContext.cs`

Luồng phải vẽ được:

```text
ProductList.jsx
-> productService.getAll(params)
-> api.get('/products', { params })
-> API Gateway
-> ProductsController
-> CatalogService
-> ProductRepository / AppDbContext
-> trả dữ liệu
-> setState
-> render bảng admin
```

Câu hỏi phải trả lời được:

- Một trang list admin thường có những state nào?
- Search/filter/pagination nằm ở đâu?
- Khi bấm thêm/sửa thì mở component nào?
- Khi submit form thì gọi service nào?
- DTO khác Entity ở điểm nào?
- Controller khác Service ở điểm nào?
- Nếu thêm một field mới vào sản phẩm thì sửa frontend admin những file nào?
- Nếu backend chưa trả field đó thì cần sửa backend những file nào?

Bài tập code:

- Thêm một cột mới vào bảng sản phẩm.
- Thêm validation bắt buộc nhập tên sản phẩm.
- Thêm nút reset bộ lọc trong một trang list.
- Code lại một service đơn giản:

```js
const getAll = (params) => api.get('/products', { params });
const create = (data) => api.post('/products', data);
const update = (id, data) => api.put(`/products/${id}`, data);
const remove = (id) => api.delete(`/products/${id}`);
```

Kết quả cuối ngày:

- Nhìn một trang CRUD admin biết nó lấy dữ liệu, mở form, submit và reload danh sách ở đâu.

## Ngày 3 - Admin nghiệp vụ: đơn hàng, voucher, kho

Mục tiêu:

- Hiểu các module admin có nghiệp vụ thật.
- Giải thích được trạng thái đơn hàng, thanh toán, tồn kho, voucher.
- Thêm được filter/badge/action nhỏ trong trang admin.

### 1. Đơn hàng

File admin:

- `frontend-admin/src/pages/orders/OrderList.jsx`
- `frontend-admin/src/pages/orders/OrderDetail.jsx`
- `frontend-admin/src/pages/orders/PosOrder.jsx`
- `frontend-admin/src/services/orderService.js`
- `frontend-admin/src/utils/statusMappings.js`

File backend:

- `backend/src/MoToSale.APIService/Controllers/OrdersController.cs`
- `backend/src/MoToSale.Services/Ordering/OrderService.cs`
- `backend/src/MoToSale.DTO/Ordering/OrderingDtos.cs`
- `backend/src/MoToSale.Entities/Ordering/Order.cs`
- `backend/src/MoToSale.Common/OrderEnums.cs`

Luồng cần nắm:

```text
OrderList.jsx
-> orderService.getAll(params)
-> OrdersController
-> OrderService
-> OrderRepository / AppDbContext
-> render bảng đơn hàng
```

### 2. Voucher

File admin:

- `frontend-admin/src/pages/vouchers/VoucherList.jsx`
- `frontend-admin/src/services/voucherService.js`

File backend:

- `backend/src/MoToSale.APIService/Controllers/VouchersController.cs`
- `backend/src/MoToSale.Services/Ordering/VoucherService.cs`
- `backend/src/MoToSale.Services/Ordering/IVoucherService.cs`

### 3. Kho

File admin:

- `frontend-admin/src/pages/inventory/InventoryView.jsx`
- `frontend-admin/src/pages/inventory/StockDocumentList.jsx`
- `frontend-admin/src/services/inventoryService.js`

File backend:

- `backend/src/MoToSale.Services/Inventory/InventoryService.cs`
- `backend/src/MoToSale.Services/Inventory/IInventoryService.cs`
- `backend/src/MoToSale.Repository/Inventory`

Câu hỏi phải trả lời được:

- Đơn hàng có những trạng thái nào?
- Trạng thái thanh toán khác trạng thái đơn hàng thế nào?
- `OrderDetail` lấy id đơn hàng từ đâu?
- Khi cập nhật trạng thái đơn hàng thì frontend gọi API nào?
- Voucher có các điều kiện áp dụng nào?
- Low stock/out of stock hiển thị ở admin thế nào?
- Kho ảnh hưởng gì đến bán hàng/POS?

Bài tập code:

- Thêm filter trạng thái đơn hàng.
- Thêm badge màu cho trạng thái đơn hàng.
- Thêm nút reset filter ở `OrderList`.
- Thêm confirm trước khi xoá voucher.
- Thêm cột “Ngày tạo” hoặc “Trạng thái” vào bảng voucher/kho.

Kết quả cuối ngày:

- Giải thích được một module admin nghiệp vụ từ UI tới backend service.

## Ngày 4 - Luyện thi thực tế: vấn đáp + code lại + thêm chức năng

Mục tiêu:

- Trả lời được như khi bảo vệ bài tập lớn.
- Code lại được đoạn nhỏ không cần nhìn.
- Thêm được một chức năng nhỏ trong admin.

### Phần 1 - Thuyết trình 10 phút

Tự nói theo khung:

```text
1. Em phụ trách Backend và Frontend Admin.
2. Admin dùng để quản lý sản phẩm, đơn hàng, kho, voucher, người dùng, báo cáo.
3. Admin app dùng React Router, AuthContext, ProtectedRoute, axios service.
4. Mọi API đi qua api.js, gắn JWT token.
5. Request đi qua API Gateway rồi vào controller backend.
6. Backend controller gọi service, service xử lý nghiệp vụ, repository/DbContext làm việc với database.
7. Database dùng EF Core code-first: Entity, DbContext, Migration, Seed.
8. Nếu thêm chức năng nhỏ, em xác định page admin, service JS, endpoint backend, DTO, service, repository/entity liên quan.
```

### Phần 2 - Code lại các đoạn hay bị hỏi

Code lại:

- `ProtectedRoute`
- `api.js` request interceptor
- `authService.login`
- Một service CRUD admin
- Một form React có state/loading/error/submit
- Một hàm format tiền/trạng thái

### Phần 3 - Thêm chức năng nhỏ hoàn chỉnh

Chọn 1 bài:

| Mức | Bài |
|---|---|
| Dễ | Thêm nút reset filter ở danh sách đơn hàng |
| Vừa | Thêm filter trạng thái ở đơn hàng/voucher |
| Vừa | Thêm cột mới vào bảng admin |
| Khá | Thêm modal confirm trước khi xoá |
| Khá | Thêm validation vào form sản phẩm/voucher |

Khi làm phải giải thích được:

```text
Em sửa file admin nào?
Em thêm state nào?
Em gọi service nào?
Request đi đến endpoint nào?
Backend controller/service nào xử lý?
Backend có cần sửa DTO/entity không?
```

## File ưu tiên cao nhất

Học theo thứ tự:

1. `frontend-admin/src/App.jsx`
2. `frontend-admin/src/contexts/AuthContext.jsx`
3. `frontend-admin/src/services/api.js`
4. `frontend-admin/src/pages/Login.jsx`
5. `frontend-admin/src/components/ProtectedRoute.jsx`
6. `frontend-admin/src/components/MainLayout.jsx`
7. `frontend-admin/src/components/Sidebar.jsx`
8. `frontend-admin/src/pages/Dashboard.jsx`
9. `frontend-admin/src/pages/products/ProductList.jsx`
10. `frontend-admin/src/pages/products/ProductForm.jsx`
11. `frontend-admin/src/services/productService.js`
12. `frontend-admin/src/pages/orders/OrderList.jsx`
13. `frontend-admin/src/pages/orders/OrderDetail.jsx`
14. `frontend-admin/src/services/orderService.js`
15. `frontend-admin/src/pages/vouchers/VoucherList.jsx`
16. `frontend-admin/src/pages/inventory/InventoryView.jsx`

Backend cần hiểu theo luồng:

1. `backend/src/MoToSale.ApiGateway/ocelot.json`
2. `backend/src/MoToSale.AuthService/Controllers/AuthController.cs`
3. `backend/src/MoToSale.APIService/Controllers/ProductsController.cs`
4. `backend/src/MoToSale.APIService/Controllers/OrdersController.cs`
5. `backend/src/MoToSale.APIService/Controllers/VouchersController.cs`
6. `backend/src/MoToSale.Services/Catalog/CatalogService.cs`
7. `backend/src/MoToSale.Services/Ordering/OrderService.cs`
8. `backend/src/MoToSale.Services/Ordering/VoucherService.cs`
9. `backend/src/MoToSale.Repository/AppDbContext.cs`
10. Các DTO liên quan trong `backend/src/MoToSale.DTO`

## Câu tủ nên chuẩn bị

- Em phụ trách phần nào của project?
- Frontend Admin khác Storefront ở đâu?
- Backend được chia lớp như thế nào?
- Database được code bằng EF Core ra sao?
- Admin app route như thế nào?
- Login admin hoạt động như thế nào?
- JWT được lưu và gửi lên backend ra sao?
- `ProtectedRoute` dùng để làm gì?
- Một trang CRUD admin gồm những phần nào?
- Khi thêm filter trong admin cần sửa những gì?
- Khi thêm một field mới cần sửa frontend và backend ở đâu?
- Controller, Service, Repository, DTO, Entity khác nhau thế nào?
- API Gateway dùng để làm gì?

## Cách ôn

Mỗi ngày làm theo 3 bước:

```text
1. Đọc file admin trước.
2. Vẽ luồng frontend -> service JS -> backend.
3. Tự code lại hoặc thêm một chức năng nhỏ.
```

Không học thuộc từng dòng. Học để trả lời được:

```text
File này làm gì?
Nó gọi file nào?
Dữ liệu đi đâu?
Nếu sửa chức năng này thì sửa chỗ nào?
```
