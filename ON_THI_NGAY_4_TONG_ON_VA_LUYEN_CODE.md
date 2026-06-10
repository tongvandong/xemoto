# Đề cương ôn thi Ngày 4 - Tổng ôn vấn đáp và luyện code lại

## I. Mục tiêu trong ngày

Ngày 4 không học thêm module mới.  
Ngày 4 dùng để biến kiến thức của 3 ngày trước thành khả năng **trả lời được, vẽ được luồng, đọc được code và code lại được đoạn nhỏ**.

Bạn phụ trách **Backend và Frontend Admin**, nên mục tiêu Ngày 4 là:

- Nói trơn tru luồng tổng quát từ admin page xuống database.
- Trả lời được các câu vấn đáp về kiến trúc.
- Nhận ra một file thuộc tầng nào: page, service JS, controller, service backend, repository, DTO, entity, migration.
- Code lại được các đoạn nhỏ nếu giảng viên xoá.
- Thêm được một chức năng nhỏ có cả frontend admin và backend.
- Biết giải thích vì sao nghiệp vụ quan trọng phải nằm ở backend.

Sau khi học xong Ngày 4, cần trả lời được:

- Em phụ trách phần nào trong project?
- Project admin gọi backend theo luồng nào?
- Controller, Service, Repository khác nhau thế nào?
- DTO khác Entity thế nào?
- JWT được lưu và gửi đi như thế nào?
- Migration dùng để làm gì?
- Nếu thêm field mới thì sửa những file nào?
- Nếu xoá một hàm `fetch`, `handleSubmit`, `SearchAsync`, `mapPayload`, có thể viết lại không?
- Nếu thêm một chức năng nhỏ, em sẽ lần theo luồng ra sao?

## II. Câu trả lời tổng quan cần học thuộc

Nếu giảng viên hỏi:

```text
Em phụ trách phần nào trong project?
```

Trả lời:

```text
Em phụ trách Backend và Frontend Admin. Ở frontend admin, em nắm các page quản trị, route, layout, AuthContext, ProtectedRoute, service JS gọi API và các component bảng/form/modal. Ở backend, em nắm controller, service, repository, DTO, entity, AppDbContext, migration và luồng xử lý request từ admin xuống SQL Server.
```

Nếu giảng viên hỏi:

```text
Hệ thống admin hoạt động theo luồng nào?
```

Trả lời:

```text
Luồng chung là Admin Page gọi service JS, service dùng api.js/axios để gửi request kèm JWT. Request đi qua API Gateway xuống Controller tương ứng. Controller kiểm tra quyền và nhận DTO, sau đó gọi Service. Service xử lý nghiệp vụ, gọi Repository hoặc AppDbContext để đọc ghi database. Dữ liệu được trả ngược lại frontend để setState và render giao diện.
```

Luồng phải vẽ được:

```text
Frontend Admin Page
-> service JS
-> api.js / axios interceptor
-> API Gateway
-> Controller
-> Service
-> Repository / AppDbContext
-> Entity / SQL Server
-> Response DTO
-> setState
-> render UI
```

## III. Bản đồ project cần nhớ

| Tầng | Ví dụ file | Vai trò |
|---|---|---|
| Page frontend | `ProductList.jsx`, `OrderDetail.jsx`, `VoucherList.jsx`, `InventoryView.jsx` | Hiển thị UI, giữ state, bắt sự kiện |
| Service frontend | `productService.js`, `orderService.js`, `voucherService.js`, `inventoryService.js` | Gom API call, component không gọi axios trực tiếp |
| API core frontend | `api.js` | Tạo axios instance, gắn JWT, xử lý 401 |
| Controller backend | `ProductsController.cs`, `OrdersController.cs` | Nhận request, kiểm tra quyền, gọi service |
| Service backend | `CatalogService.cs`, `OrderService.cs`, `VoucherService.cs`, `InventoryService.cs` | Xử lý nghiệp vụ chính |
| Repository | `ProductRepository.cs`, `OrderRepository.cs`, `InventoryRepository.cs` | Truy vấn database |
| DTO | `CatalogDtos.cs`, `OrderingDtos.cs`, `InventoryDtos.cs` | Dữ liệu request/response |
| Entity | `Product.cs`, `Order.cs`, `Voucher.cs`, `InventoryItem.cs` | Mô hình bảng database |
| DbContext | `AppDbContext.cs` | Khai báo DbSet, quan hệ, constraint |
| Migration | `Migrations/*.cs` | Lịch sử thay đổi schema database |

## IV. Công thức trả lời mọi luồng

Khi bị hỏi một chức năng bất kỳ, trả lời theo công thức:

```text
1. Frontend page nào xử lý?
2. Page đó có state/form/action gì?
3. Page gọi service JS nào?
4. Service JS gọi endpoint nào?
5. Controller backend nhận endpoint đó ở hàm nào?
6. Controller gọi service backend nào?
7. Service xử lý nghiệp vụ gì?
8. Repository/AppDbContext truy vấn bảng nào?
9. Kết quả trả về frontend và render ra sao?
```

Ví dụ với sản phẩm:

```text
ProductList.jsx
-> productService.getAll(params)
-> GET /api/products
-> ProductsController.Search
-> CatalogService.SearchProductsAsync
-> ProductRepository.SearchAsync
-> Products, Skus, Images
-> trả PagingResponse
-> setProducts và render bảng
```

Ví dụ với đơn hàng:

```text
OrderDetail.jsx
-> orderService.updateStatus(id, payload)
-> PUT /api/orders/{id}/status
-> OrdersController.UpdateStatus
-> OrderService.UpdateStatusAsync
-> cập nhật OrderStatus, thêm history/audit
-> SaveChanges
-> frontend fetchOrder lại
```

Ví dụ với tồn kho:

```text
InventoryView.jsx
-> inventoryService.adjustStock(payload)
-> POST /api/inventory/adjust
-> InventoryController.Adjust
-> InventoryService.AdjustStockAsync
-> cập nhật InventoryItem.OnHand
-> ghi StockMovement
-> SaveChanges
-> frontend fetchInventory lại
```

## V. 10 câu vấn đáp kiến trúc phải học thuộc

### Câu 1. Vì sao phải tách frontend service JS?

Trả lời:

```text
Service JS giúp gom các API call theo từng module. Component không cần biết chi tiết axios hay endpoint đầy đủ, chỉ cần gọi productService, orderService hoặc voucherService. Nhờ vậy code page gọn hơn, dễ sửa endpoint và dễ tái sử dụng.
```

### Câu 2. `api.js` làm gì?

Trả lời:

```text
api.js tạo axios instance dùng chung cho frontend admin. Nó cấu hình baseURL, tự gắn JWT từ localStorage vào header Authorization và xử lý lỗi 401 bằng cách xoá token/user rồi đưa người dùng về trang login.
```

### Câu 3. Controller khác Service backend thế nào?

Trả lời:

```text
Controller là nơi nhận HTTP request, đọc route/query/body, kiểm tra quyền và trả HTTP response. Service là nơi xử lý nghiệp vụ chính như validate dữ liệu, tính toán, kiểm tra tồn kho, cập nhật trạng thái và gọi repository để lưu database.
```

### Câu 4. Repository dùng để làm gì?

Trả lời:

```text
Repository là lớp truy vấn dữ liệu. Nó bọc các thao tác với AppDbContext/DbSet, ví dụ tìm kiếm, lọc, phân trang, include quan hệ. Service gọi repository thay vì viết trực tiếp toàn bộ query trong controller.
```

### Câu 5. DTO khác Entity thế nào?

Trả lời:

```text
Entity mô tả bảng trong database, ví dụ Product, Order, Voucher. DTO là dữ liệu dùng để nhận request hoặc trả response API. Không nên trả thẳng toàn bộ Entity nếu frontend chỉ cần một phần dữ liệu hoặc cần format khác.
```

### Câu 6. Migration dùng để làm gì?

Trả lời:

```text
Migration là lịch sử thay đổi cấu trúc database khi dùng EF Core code-first. Khi thêm bảng, thêm cột, đổi quan hệ hoặc constraint thì sửa Entity/AppDbContext rồi tạo migration. Khi chạy app hoặc chạy lệnh update database, EF áp các migration chưa có trong bảng __EFMigrationsHistory.
```

### Câu 7. Khi nào cần tạo migration mới?

Trả lời:

```text
Khi thay đổi schema database thì cần migration mới, ví dụ thêm bảng, thêm cột, đổi kiểu dữ liệu, thêm index, thêm quan hệ. Nếu chỉ sửa giao diện, sửa logic frontend, sửa query filter hoặc sửa validate không làm đổi cấu trúc bảng thì không cần migration.
```

### Câu 8. Tracking trong EF Core là gì?

Trả lời:

```text
Tracking là cơ chế EF Core theo dõi entity lấy từ database. Nếu entity được tracking, khi mình sửa thuộc tính rồi gọi SaveChanges, EF biết cần tạo câu UPDATE. Với truy vấn chỉ để đọc danh sách, có thể dùng AsNoTracking để nhẹ hơn vì không cần lưu trạng thái thay đổi.
```

### Câu 9. Vì sao nghiệp vụ quan trọng phải nằm ở backend?

Trả lời:

```text
Frontend chỉ hỗ trợ trải nghiệm người dùng và validate cơ bản. Người dùng có thể sửa request gửi lên, nên các nghiệp vụ quan trọng như kiểm tra quyền, kiểm tra tồn kho, tính giảm giá voucher, cập nhật tổng tiền, cập nhật trạng thái đơn phải xử lý lại ở backend.
```

### Câu 10. Nếu thêm một chức năng nhỏ thì bắt đầu từ đâu?

Trả lời:

```text
Em sẽ xác định chức năng thuộc module nào, sau đó lần theo luồng từ frontend page tới service JS, endpoint backend, controller, service, repository và database. Nếu chỉ thêm hiển thị hoặc filter đơn giản thì có thể chỉ sửa frontend và query. Nếu thêm field lưu database thì phải sửa Entity, DTO, Service, frontend form và tạo migration.
```

## VI. Tổng ôn Ngày 1 - Auth

Luồng login cần thuộc:

```text
Login.jsx
-> AuthContext.login()
-> authService.login()
-> api.post('/auth/login')
-> API Gateway
-> AuthController.Login
-> AuthService.LoginAsync
-> kiểm tra email/password
-> tạo JWT
-> trả token + user
-> lưu admin_token/admin_user
-> ProtectedRoute cho vào admin
```

Câu trả lời ngắn:

```text
Frontend admin đăng nhập ở Login.jsx nhưng logic đăng nhập nằm trong AuthContext. AuthContext gọi authService.login, authService dùng api.js gửi POST /auth/login. Backend kiểm tra tài khoản, mật khẩu, role và tạo JWT. Token được lưu ở localStorage với key admin_token. Các request sau được api.js tự gắn Authorization: Bearer token.
```

Đoạn code cần luyện viết lại:

```jsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};
```

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## VII. Tổng ôn Ngày 2 - CRUD sản phẩm

Luồng danh sách sản phẩm:

```text
ProductList.jsx
-> fetchProducts()
-> productService.getAll(params)
-> GET /api/products
-> ProductsController.Search
-> CatalogService.SearchProductsAsync
-> ProductRepository.SearchAsync
-> trả PagingResponse<ProductListItem>
-> render bảng
```

Luồng thêm/sửa sản phẩm:

```text
ProductForm.jsx
-> handleSubmit()
-> validate form
-> productService.create/update(payload)
-> ProductsController.Create/Update
-> CatalogService.CreateProductAsync/UpdateProductAsync
-> kiểm tra code/slug/category/brand
-> lưu Product và Sku
-> SaveChanges
```

Câu trả lời ngắn:

```text
CRUD sản phẩm ở admin gồm trang list và form. List giữ state tìm kiếm, lọc, phân trang và gọi productService.getAll. Form giữ state input, validate dữ liệu rồi gọi create hoặc update. Backend nhận request ở ProductsController, xử lý trong CatalogService, truy vấn qua ProductRepository và lưu bằng AppDbContext.
```

Đoạn code service cần luyện:

```js
const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};
```

## VIII. Tổng ôn Ngày 3 - Orders, Voucher, Inventory

### 1. Orders

Luồng xem danh sách:

```text
OrderList.jsx
-> orderService.getAll(params)
-> GET /api/orders
-> OrdersController.Search
-> OrderService.SearchOrdersAsync
-> trả PagingResponse<OrderListItem>
```

Luồng cập nhật trạng thái:

```text
OrderDetail.jsx
-> handleUpdateStatus()
-> orderService.updateStatus(id, { toStatus, note })
-> PUT /api/orders/{id}/status
-> OrdersController.UpdateStatus
-> OrderService.UpdateStatusAsync
-> cập nhật OrderStatus
-> thêm OrderStatusHistory/AuditLog
```

Câu trả lời ngắn:

```text
Đơn hàng có nhiều trạng thái tách nhau: OrderStatus cho vòng đời đơn, PaymentStatus cho thanh toán và FulfillmentStatus cho xử lý hàng. Tách như vậy vì một đơn có thể đã thanh toán nhưng chưa giao, hoặc đang giao nhưng COD vẫn chưa thanh toán.
```

### 2. POS

Luồng tạo đơn POS:

```text
PosOrder.jsx
-> orderService.createPos(payload)
-> POST /api/orders/pos
-> OrdersController.CreatePos
-> OrderService.CreatePosOrderAsync
-> kiểm tra tồn khả dụng
-> validate voucher nếu có
-> tạo Order/OrderLine
-> trừ kho hoặc giữ chỗ
-> trả id đơn
```

Câu trả lời ngắn:

```text
POS là luồng admin/staff tạo đơn tại quầy. Frontend gửi danh sách SKU, số lượng, giá, khách hàng, voucher và thanh toán. Backend kiểm tra lại tồn khả dụng, tính tổng tiền, validate voucher và quyết định trừ kho ngay hay giữ chỗ.
```

### 3. Voucher

Luồng validate voucher:

```text
OrderService
-> VoucherService.ValidateAsync(code, subtotal)
-> kiểm tra mã tồn tại
-> kiểm tra Active
-> kiểm tra thời gian hiệu lực
-> kiểm tra đơn tối thiểu
-> kiểm tra lượt dùng
-> tính discount
```

Câu trả lời ngắn:

```text
Voucher không chỉ là CRUD. Khi tạo đơn, backend phải validate voucher để đảm bảo mã còn hiệu lực, còn lượt dùng, đạt giá trị đơn tối thiểu và tính đúng số tiền giảm. Không để frontend tự quyết định tiền giảm.
```

### 4. Inventory

Công thức phải thuộc:

```text
Available = OnHand - Reserved
```

Giải thích:

```text
OnHand là tồn thực tế trong kho. Reserved là số lượng đang giữ cho đơn chưa hoàn tất. Available là số lượng còn có thể bán. Ví dụ OnHand 10, Reserved 3 thì Available 7.
```

Luồng điều chỉnh tồn:

```text
InventoryView.jsx
-> inventoryService.adjustStock(payload)
-> POST /api/inventory/adjust
-> InventoryController.Adjust
-> InventoryService.AdjustStockAsync
-> kiểm tra không làm OnHand nhỏ hơn Reserved
-> cập nhật OnHand
-> ghi StockMovement
```

Luồng phiếu kho:

```text
StockDocumentList.jsx
-> createDocument()
-> phiếu Draft
-> approveDocument()
-> InventoryService.ApproveDocumentAsync
-> áp thay đổi vào tồn kho
-> ghi StockMovement
```

## IX. Bài luyện code lại khi bị xoá

### Bài 1. Code lại hàm fetch list frontend

Mẫu:

```jsx
const fetchItems = async () => {
  setLoading(true);
  setError('');

  try {
    const res = await service.getAll({ page, pageSize, keyword });
    const data = res.data;
    setItems(data.items || data.data || []);
    setTotalPages(data.totalPages || 1);
  } catch (err) {
    setError(err?.response?.data?.message || 'Không tải được dữ liệu.');
  } finally {
    setLoading(false);
  }
};
```

Áp dụng được cho:

- `ProductList.jsx`
- `OrderList.jsx`
- `VoucherList.jsx`
- `InventoryView.jsx`

### Bài 2. Code lại hàm submit form frontend

Mẫu:

```jsx
const handleSubmit = async (event) => {
  event.preventDefault();
  setSaving(true);
  setError('');

  try {
    if (isEdit) {
      await service.update(id, form);
    } else {
      await service.create(form);
    }
    await fetchItems();
    setShowModal(false);
  } catch (err) {
    setError(err?.response?.data?.message || 'Lưu dữ liệu thất bại.');
  } finally {
    setSaving(false);
  }
};
```

### Bài 3. Code lại service JS CRUD

Mẫu:

```js
import api from './api';

const service = {
  getAll: (params) => api.get('/resource', { params }),
  getById: (id) => api.get(`/resource/${id}`),
  create: (data) => api.post('/resource', data),
  update: (id, data) => api.put(`/resource/${id}`, data),
  delete: (id) => api.delete(`/resource/${id}`),
};

export default service;
```

### Bài 4. Code lại endpoint Controller đơn giản

Mẫu:

```csharp
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[HttpGet]
public async Task<IActionResult> Search([FromQuery] PagingRequest request)
{
    var result = await _service.SearchAsync(request);
    return Ok(result);
}
```

Mẫu create:

```csharp
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[HttpPost]
public async Task<IActionResult> Create(SaveRequest request)
{
    try
    {
        var id = await _service.CreateAsync(request);
        return Ok(new { id });
    }
    catch (DomainException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
}
```

### Bài 5. Code lại repository search cơ bản

Mẫu:

```csharp
public async Task<PagingResponse<Product>> SearchAsync(ProductSearchRequest request)
{
    var query = Query.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(request.Keyword))
    {
        query = query.Where(x => x.Name.Contains(request.Keyword));
    }

    var total = await query.CountAsync();
    var items = await query
        .Skip((request.Page - 1) * request.PageSize)
        .Take(request.PageSize)
        .ToListAsync();

    return new PagingResponse<Product>
    {
        Items = items,
        Page = request.Page,
        PageSize = request.PageSize,
        TotalItems = total
    };
}
```

## X. Bài luyện thêm chức năng nhỏ

### Bài 1. Thêm filter trạng thái sản phẩm

Sửa frontend:

```text
ProductList.jsx
-> thêm state status
-> thêm select trạng thái
-> truyền status vào productService.getAll
```

Sửa backend nếu chưa hỗ trợ:

```text
ProductSearchRequest
-> thêm Status
ProductRepository.SearchAsync
-> if Status != null thì Where theo status
```

Không cần migration vì chỉ thêm filter, không đổi database.

### Bài 2. Thêm cột "Tồn khả dụng" vào bảng tồn kho

Sửa frontend:

```text
InventoryView.jsx
-> thêm cột Available
-> dùng item.available hoặc tính OnHand - Reserved
```

Nếu backend đã trả `Available` thì không cần sửa backend.  
Nếu backend chưa trả, sửa:

```text
InventoryItemDto
InventoryService/GetInventoryAsync hoặc repository query
```

Không cần migration nếu chỉ thêm field response tính toán.

### Bài 3. Thêm ô tìm kiếm voucher

Sửa frontend:

```text
VoucherList.jsx
-> thêm state keyword
-> thêm input search
-> truyền keyword vào voucherService.getAll
```

Sửa backend nếu chưa hỗ trợ:

```text
PagingRequest hoặc VoucherSearchRequest
VoucherService.SearchAsync
-> Where code/description Contains keyword
```

Không cần migration.

### Bài 4. Thêm trường ghi chú cho voucher

Nếu database đã có `Description`:

```text
VoucherList.jsx
voucherService.mapPayload
SaveVoucherRequest
VoucherService.CreateAsync/UpdateAsync
```

Không cần migration.

Nếu database chưa có cột:

```text
Voucher.cs
AppDbContext config nếu cần
SaveVoucherRequest
VoucherService
VoucherList.jsx
voucherService.js
Tạo migration mới
Apply migration
```

### Bài 5. Thêm nút "Đánh dấu đã giao"

Sửa frontend:

```text
OrderDetail.jsx
-> thêm button
-> onClick gọi orderService.updateStatus(id, { toStatus: 'Delivered' })
-> fetchOrder lại sau khi thành công
```

Backend đã có:

```text
PUT /api/orders/{id}/status
OrdersController.UpdateStatus
OrderService.UpdateStatusAsync
```

Không cần migration.

## XI. Cách xử lý khi bị xoá code trong phòng thi

Khi thấy một đoạn code bị xoá, không viết ngay. Làm theo thứ tự:

```text
1. Xác định file đó thuộc tầng nào.
2. Xác định input của hàm là gì.
3. Xác định output cần trả về hoặc state cần set.
4. Xác định service/API/database liên quan.
5. Viết bản tối thiểu chạy được trước.
6. Sau đó mới thêm loading/error/validate.
```

Ví dụ bị xoá `handleUpdateStatus`:

```text
File: OrderDetail.jsx
Input: id đơn, newStatus, note
API cần gọi: orderService.updateStatus hoặc orderService.cancel
Sau khi thành công: fetchOrder()
State cần xử lý: updating, modal, error
```

Bản tối thiểu:

```jsx
const handleUpdateStatus = async () => {
  setUpdating(true);
  try {
    await orderService.updateStatus(id, { toStatus: newStatus, note: cancelReason });
    await fetchOrder();
    setShowStatusModal(false);
  } finally {
    setUpdating(false);
  }
};
```

Ví dụ bị xoá `mapPayload` voucher:

```text
File: voucherService.js
Input: form frontend
Output: object đúng shape backend SaveVoucherRequest
```

Bản tối thiểu:

```js
const mapPayload = (data = {}) => ({
  code: data.code,
  description: data.description || null,
  discountType: data.discountType || 'Percent',
  discountValue: Number(data.discountValue || 0),
  maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
  minOrderValue: Number(data.minOrderValue || 0),
  usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
  startAt: data.startAt || null,
  endAt: data.endAt || null,
  status: data.status === 'Inactive' ? 0 : 1,
});
```

## XII. Checklist tổng ôn cuối cùng

Trước khi thi, tự tick:

- [ ] Nói được phạm vi mình phụ trách: Backend + Frontend Admin.
- [ ] Vẽ được luồng tổng quát từ Admin Page xuống SQL Server.
- [ ] Giải thích được `api.js`, JWT, localStorage, ProtectedRoute.
- [ ] Giải thích được Controller, Service, Repository.
- [ ] Giải thích được DTO, Entity, DbContext, Migration.
- [ ] Nói được luồng CRUD sản phẩm.
- [ ] Nói được luồng Orders, POS, Voucher, Inventory.
- [ ] Phân biệt được `OrderStatus`, `PaymentStatus`, `FulfillmentStatus`.
- [ ] Giải thích được `OnHand`, `Reserved`, `Available`.
- [ ] Biết khi nào cần migration.
- [ ] Code lại được một hàm fetch list.
- [ ] Code lại được một hàm submit form.
- [ ] Code lại được một service JS CRUD.
- [ ] Code lại được một endpoint Controller đơn giản.
- [ ] Thêm được một filter hoặc một cột mới.

## XIII. Bài nói 3 phút để học thuộc

Nếu giảng viên yêu cầu trình bày nhanh project, nói:

```text
Project MoToSale v2 gồm backend, frontend-admin và frontend-store, trong đó phần em phụ trách là Backend và Frontend Admin. Frontend Admin là trang quản trị cho admin/staff, gồm đăng nhập, dashboard, quản lý sản phẩm, danh mục, đơn hàng, voucher và tồn kho.

Luồng chung của admin là page React giữ state và hiển thị giao diện, sau đó gọi service JS như productService, orderService, voucherService. Các service này dùng api.js, trong đó axios tự gắn JWT từ localStorage vào header Authorization. Request đi qua API Gateway rồi xuống Controller backend.

Ở backend, Controller nhận request, kiểm tra quyền và gọi Service. Service xử lý nghiệp vụ chính, ví dụ login thì kiểm tra user và tạo JWT, sản phẩm thì validate và lưu Product/Sku, đơn hàng thì kiểm tra tồn kho, validate voucher, cập nhật trạng thái, giữ chỗ hoặc trừ kho. Khi cần truy vấn database, Service dùng Repository hoặc AppDbContext. Entity mô tả bảng, DTO dùng cho request/response, còn migration dùng để cập nhật schema database theo code-first.

Nếu bị yêu cầu thêm chức năng nhỏ, em sẽ lần theo đúng luồng frontend page -> service JS -> controller -> service backend -> repository/database. Nếu chỉ thêm filter hoặc hiển thị thì thường không cần migration. Nếu thêm field lưu vào database thì phải sửa Entity, DTO, Service, frontend form và tạo migration mới.
```

## XIV. Lịch học Ngày 4

### Buổi 1 - Tổng ôn luồng

Việc cần làm:

- Đọc mục II, III, IV.
- Tự vẽ luồng tổng quát 3 lần.
- Tự nói lại luồng Login, Product CRUD, Order, Inventory.

Kết quả:

```text
Không cần nhìn file vẫn nói được request đi qua những tầng nào.
```

### Buổi 2 - Học thuộc câu vấn đáp

Việc cần làm:

- Học 10 câu ở mục V.
- Đọc to câu trả lời.
- Tự đổi ví dụ từ Product sang Order/Voucher/Inventory.

Kết quả:

```text
Trả lời được câu hỏi kiến trúc mà không bị bí thuật ngữ.
```

### Buổi 3 - Luyện code lại

Việc cần làm:

- Viết lại `fetchItems`.
- Viết lại `handleSubmit`.
- Viết lại service JS CRUD.
- Viết lại Controller Search/Create.
- Viết lại repository search cơ bản.

Kết quả:

```text
Nếu giảng viên xoá một đoạn nhỏ, có thể viết lại bản tối thiểu chạy được.
```

### Buổi 4 - Luyện thêm chức năng nhỏ

Việc cần làm:

- Chọn 2 bài trong mục X.
- Tự nói sửa file nào trước.
- Nếu có thời gian thì code thử trên project.

Kết quả:

```text
Biết phân biệt chức năng nào cần sửa frontend, backend, database và migration.
```

