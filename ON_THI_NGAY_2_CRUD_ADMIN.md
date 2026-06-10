# Đề cương ôn thi Ngày 2 - CRUD Admin và Backend Catalog

## I. Mục tiêu trong ngày

Ngày 2 tập trung vào nhóm chức năng quản trị dữ liệu cơ bản trong Admin:

- Sản phẩm
- Danh mục
- Hãng xe
- Hãng sản xuất phụ tùng

Sau khi học xong cần trả lời được:

- Một trang CRUD trong Admin hoạt động như thế nào?
- Frontend Admin gọi API bằng service JS ra sao?
- Backend nhận request qua Controller nào?
- Service backend xử lý nghiệp vụ gì?
- Repository/DbContext đọc ghi database như thế nào?
- DTO khác Entity ở đâu?
- Nếu thêm một field mới cho sản phẩm thì cần sửa những file nào?

## II. Luồng CRUD tổng quát cần thuộc

Luồng đọc danh sách:

```text
Admin Page
-> service JS
-> api.js axios
-> API Gateway
-> Controller
-> Service
-> Repository / AppDbContext
-> SQL Server
-> trả DTO
-> setState
-> render bảng
```

Luồng thêm/sửa:

```text
Form Admin
-> validate dữ liệu frontend
-> service JS gửi POST/PUT
-> Controller nhận DTO
-> Service validate nghiệp vụ
-> Repository/AppDbContext thêm hoặc sửa Entity
-> SaveChanges
-> trả kết quả
-> frontend đóng modal/form
-> reload danh sách
```

Luồng xoá:

```text
Button xoá
-> confirm
-> service JS gửi DELETE
-> Controller nhận id
-> Service kiểm tra dữ liệu
-> Repository/AppDbContext xoá hoặc đổi trạng thái
-> SaveChanges
-> frontend reload danh sách
```

## III. File Frontend Admin cần đọc

### 1. Sản phẩm

| File | Vai trò |
|---|---|
| `frontend-admin/src/pages/products/ProductList.jsx` | Trang danh sách sản phẩm, search/filter/pagination, mở form |
| `frontend-admin/src/pages/products/ProductForm.jsx` | Form thêm/sửa sản phẩm |
| `frontend-admin/src/pages/products/ImageManager.jsx` | Quản lý ảnh sản phẩm |
| `frontend-admin/src/pages/products/VariantManager.jsx` | Quản lý biến thể/SKU |
| `frontend-admin/src/services/productService.js` | Gọi API sản phẩm |

### 2. Danh mục, hãng, nhà sản xuất

| File | Vai trò |
|---|---|
| `frontend-admin/src/pages/categories/CategoryList.jsx` | CRUD danh mục |
| `frontend-admin/src/pages/brands/BrandList.jsx` | CRUD hãng xe/dòng xe |
| `frontend-admin/src/pages/manufacturers/ManufacturerList.jsx` | CRUD hãng sản xuất phụ tùng |
| `frontend-admin/src/services/categoryService.js` | Gọi API danh mục |
| `frontend-admin/src/services/brandService.js` | Gọi API hãng xe |
| `frontend-admin/src/services/manufacturerService.js` | Gọi API nhà sản xuất |

### 3. Component dùng chung

| File | Vai trò |
|---|---|
| `frontend-admin/src/components/ui/Button.jsx` | Button dùng chung |
| `frontend-admin/src/components/ui/DataTable.jsx` | Bảng dữ liệu dùng chung |
| `frontend-admin/src/components/ui/Modal.jsx` | Modal/confirm dùng chung |
| `frontend-admin/src/components/ui/FormControls.jsx` | Input/select/textarea/checkbox |
| `frontend-admin/src/utils/formatCurrency.js` | Format tiền |
| `frontend-admin/src/utils/constants.js` | Constant dùng trong admin |

## IV. File Backend cần đọc

### 1. Controller

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.APIService/Controllers/ProductsController.cs` | API quản lý sản phẩm, ảnh, SKU, đánh giá, yêu thích |

Nếu danh mục/hãng được xử lý chung trong controller này hoặc controller catalog liên quan, cần lần theo route trong file controller.

### 2. Service

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.Services/Catalog/CatalogService.cs` | Xử lý nghiệp vụ catalog/sản phẩm |
| `backend/src/MoToSale.Services/Catalog/ICatalogService.cs` | Interface của catalog service |

### 3. Repository và DbContext

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.Repository/Catalog/ProductRepository.cs` | Query sản phẩm |
| `backend/src/MoToSale.Repository/Catalog/IProductRepository.cs` | Interface repository sản phẩm |
| `backend/src/MoToSale.Repository/AppDbContext.cs` | DbContext chính, DbSet và cấu hình quan hệ |

### 4. Entity và DTO

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.Entities/Catalog/Product.cs` | Entity sản phẩm |
| `backend/src/MoToSale.Entities/Catalog/Category.cs` | Entity danh mục |
| `backend/src/MoToSale.Entities/Catalog/Brand.cs` | Entity hãng |
| `backend/src/MoToSale.DTO/Catalog/CatalogDtos.cs` | DTO request/response catalog |

## V. Cần hiểu trong Frontend Admin

### 1. State thường có trong trang list

Một trang list admin thường có:

```text
items/data        danh sách dữ liệu
loading           trạng thái đang tải
error             lỗi API
page              trang hiện tại
pageSize          số dòng mỗi trang
totalPages        tổng số trang
search/filter     điều kiện lọc
showModal         bật/tắt form
editingItem       item đang sửa
```

Ví dụ tư duy:

```text
Khi search/filter/page thay đổi
-> gọi lại fetchData
-> service JS gọi API
-> setState dữ liệu mới
```

### 2. Service JS làm gì?

Service JS là lớp trung gian giữa page React và API.

Ví dụ dạng cơ bản:

```js
const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};
```

Ý nghĩa:

```text
Page không gọi axios trực tiếp.
Page gọi service JS.
Service JS dùng api.js.
api.js tự gắn token.
```

### 3. Form thêm/sửa làm gì?

Form admin thường:

```text
1. Nhận initial data nếu đang sửa.
2. Lưu form state.
3. Validate dữ liệu.
4. Submit lên service.
5. Báo lỗi nếu thất bại.
6. Thành công thì đóng form và reload list.
```

### 4. Search/filter/pagination

Cần giải thích được:

```text
Search/filter/pagination ở frontend admin chỉ là state điều khiển request.
Backend mới là nơi query dữ liệu thật.
Frontend gửi params lên API, backend lọc và phân trang rồi trả kết quả.
```

## VI. Cần hiểu trong Backend

### 1. Controller

Controller có nhiệm vụ:

- Nhận request HTTP.
- Nhận query/body/path params.
- Gọi service.
- Trả response HTTP.

Controller không nên chứa nhiều nghiệp vụ phức tạp.

Ví dụ khi xem danh sách sản phẩm:

```text
GET /api/products
-> ProductsController
-> CatalogService
```

### 2. Service

Service có nhiệm vụ:

- Validate nghiệp vụ.
- Mapping DTO/Entity.
- Gọi repository.
- Xử lý logic như tạo mã, lọc dữ liệu, kiểm tra trùng, kiểm tra tồn tại.

Ví dụ:

```text
CatalogService tạo/sửa sản phẩm,
kiểm tra dữ liệu hợp lệ,
sau đó gọi ProductRepository hoặc AppDbContext để lưu.
```

### 3. Repository / AppDbContext

Repository có nhiệm vụ:

- Query dữ liệu.
- Thêm/sửa/xoá entity.
- Tách logic truy vấn khỏi service.

`AppDbContext` là lớp EF Core đại diện database:

```text
DbSet<Product> Products
DbSet<Category> Categories
DbSet<Brand> Brands
...
```

Khi gọi `SaveChanges`, EF Core sinh SQL tương ứng xuống SQL Server.

### 4. Entity và DTO

Entity:

```text
Đại diện bảng trong database.
Có quan hệ, khóa chính, khóa ngoại.
Ví dụ Product, Category, Brand.
```

DTO:

```text
Dữ liệu request/response của API.
Không nhất thiết giống y hệt bảng.
Giúp frontend chỉ nhận/gửi dữ liệu cần thiết.
```

Ví dụ:

```text
Product entity có thể có nhiều field nội bộ.
ProductResponse DTO chỉ trả những field admin cần hiển thị.
CreateProductRequest DTO chỉ nhận những field cần để tạo mới.
```

## VII. Nếu thêm một field mới cho sản phẩm

Ví dụ thêm field:

```text
WarrantyMonths - số tháng bảo hành
```

Cần sửa Backend:

```text
1. Thêm property WarrantyMonths vào Product entity.
2. Thêm field vào Create/Update DTO nếu admin cần nhập.
3. Thêm field vào Response DTO nếu admin cần hiển thị.
4. Sửa CatalogService để map field này.
5. Tạo migration mới.
6. Apply migration để DB có cột mới.
```

Cần sửa Frontend Admin:

```text
1. ProductForm.jsx thêm input WarrantyMonths.
2. ProductList.jsx thêm cột nếu cần hiển thị.
3. productService.js thường không cần sửa nếu endpoint không đổi.
4. Kiểm tra validate và submit payload.
```

Luồng trả lời mẫu:

```text
Nếu thêm field mới cho sản phẩm, em sửa cả backend và frontend admin.
Ở backend em thêm property vào Entity, thêm vào DTO request/response, sửa service mapping, tạo migration để thêm cột vào DB.
Ở frontend admin em thêm input trong ProductForm và thêm cột trong ProductList nếu cần.
```

## VIII. Migration và database cần nhớ

Dự án dùng:

```text
SQL Server + EF Core code-first
```

Quy trình thay đổi DB:

```text
Sửa Entity/AppDbContext
-> tạo migration
-> apply migration
-> EF cập nhật SQL Server
```

Mỗi migration chỉ apply một lần.

EF Core lưu lịch sử migration trong bảng:

```text
__EFMigrationsHistory
```

Nếu chỉ sửa logic hoặc UI, không đổi bảng/cột/quan hệ thì không cần migration.

Cần migration khi:

- Thêm bảng
- Xoá bảng
- Thêm cột
- Xoá cột
- Đổi kiểu dữ liệu
- Thêm quan hệ
- Thêm index/constraint

## IX. Câu hỏi vấn đáp cần luyện

### Nhóm 1 - CRUD Admin

1. Một trang CRUD admin gồm những phần nào?
2. Trang list thường có những state gì?
3. Khi bấm thêm sản phẩm thì frontend mở component nào?
4. Khi submit form thì frontend gọi service nào?
5. Vì sao page không nên gọi axios trực tiếp?
6. Search/filter/pagination hoạt động thế nào?
7. Khi API lỗi thì frontend hiển thị ra sao?

### Nhóm 2 - Backend Catalog

1. Controller có vai trò gì?
2. Service có vai trò gì?
3. Repository có vai trò gì?
4. AppDbContext dùng để làm gì?
5. Entity khác DTO ở đâu?
6. Khi thêm sản phẩm, backend đi qua những lớp nào?
7. Khi xoá sản phẩm, nên xoá cứng hay đổi trạng thái? Vì sao?

### Nhóm 3 - Database/Migration

1. Dự án code database theo kiểu gì?
2. Có cần tạo bảng thủ công trong SSMS không?
3. SSMS dùng để làm gì?
4. Migration dùng để làm gì?
5. Bảng `__EFMigrationsHistory` lưu gì?
6. Mỗi migration chạy mấy lần?
7. Khi thêm cột mới có cần migration không?
8. Nếu xoá Entity trong code thì DB có tự xoá bảng ngay không?

### Nhóm 4 - Thêm chức năng nhỏ

1. Nếu thêm cột “Ngày tạo” vào bảng sản phẩm thì sửa file nào?
2. Nếu thêm filter theo loại sản phẩm thì sửa frontend admin thế nào?
3. Nếu backend chưa hỗ trợ filter thì sửa backend thế nào?
4. Nếu thêm field mới cho sản phẩm thì sửa những lớp nào?
5. Nếu API trả field nhưng frontend không hiện thì kiểm tra đâu?

## X. Câu trả lời mẫu

### Câu 1: Một CRUD admin hoạt động như thế nào?

```text
Một CRUD admin thường gồm page list, form thêm/sửa và service gọi API. Page list giữ state dữ liệu, loading, error, search/filter và pagination. Khi cần lấy dữ liệu, page gọi service JS, service dùng api.js gửi request qua API Gateway đến backend controller. Controller gọi service nghiệp vụ, service dùng repository hoặc AppDbContext để đọc ghi DB. Backend trả DTO về frontend, frontend setState và render bảng.
```

### Câu 2: Entity khác DTO như thế nào?

```text
Entity là class đại diện bảng trong database, có khóa chính, khóa ngoại và quan hệ dữ liệu. DTO là object dùng cho request/response API. DTO giúp frontend chỉ gửi/nhận dữ liệu cần thiết và tránh lộ toàn bộ cấu trúc database.
```

### Câu 3: Nếu thêm một field mới cho sản phẩm thì làm gì?

```text
Em sửa cả backend và frontend admin. Backend thêm property vào Product entity, thêm field vào DTO request/response, sửa mapping trong CatalogService, tạo migration để thêm cột vào SQL Server. Frontend admin thêm input trong ProductForm, thêm cột trong ProductList nếu cần, và đảm bảo payload gửi lên có field mới.
```

### Câu 4: Có cần thao tác trên SSMS để tạo bảng không?

```text
Không bắt buộc. Dự án dùng EF Core code-first, nên cấu trúc database được quản lý bằng Entity, AppDbContext và migration. SSMS chủ yếu dùng để xem dữ liệu, kiểm tra bảng, debug query hoặc kiểm tra migration đã apply chưa.
```

### Câu 5: Khi thêm sản phẩm, dữ liệu đi xuống DB như thế nào?

```text
Ở frontend admin, ProductForm gửi dữ liệu qua productService. productService gọi API qua api.js. Request đi qua API Gateway vào ProductsController. Controller gọi CatalogService để xử lý validate và nghiệp vụ. Service dùng ProductRepository hoặc AppDbContext để thêm Product entity, sau đó SaveChanges. EF Core sinh câu lệnh INSERT xuống SQL Server.
```

## XI. Bài tập code

### Bài 1 - Code lại service CRUD đơn giản

```js
import api from './api';

const demoService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

export default demoService;
```

### Bài 2 - Thêm nút reset filter trong một trang list

Logic:

```js
const handleResetFilters = () => {
  setSearch('');
  setStatus('');
  setPage(1);
};
```

### Bài 3 - Thêm validation trong form

Logic:

```js
if (!form.name?.trim()) {
  setError('Tên sản phẩm là bắt buộc.');
  return;
}
```

### Bài 4 - Giải thích migration

Tự trả lời bằng lời:

```text
Khi thêm cột mới vào Product, tại sao phải tạo migration?
Migration sẽ sinh ra gì?
EF Core biết migration nào đã chạy bằng cách nào?
```

## XII. Checklist cuối ngày

- [ ] Vẽ được luồng CRUD từ Admin Page xuống SQL Server.
- [ ] Giải thích được vai trò của page, service JS, api.js.
- [ ] Giải thích được Controller, Service, Repository, DbContext.
- [ ] Phân biệt được Entity và DTO.
- [ ] Trả lời được khi nào cần migration.
- [ ] Trả lời được SSMS dùng để làm gì.
- [ ] Biết thêm một field mới cần sửa frontend admin và backend ở đâu.
- [ ] Code lại được một service CRUD đơn giản.
- [ ] Thêm được một validation hoặc reset filter nhỏ.
