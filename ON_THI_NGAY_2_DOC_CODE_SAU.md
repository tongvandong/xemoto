# Ngày 2 - Đọc code sâu theo luồng thực tế: Product CRUD Admin

File này dùng để học sau khi đã đọc đề cương Ngày 2. Mục tiêu là hết mông lung bằng cách lần một luồng thật từ Admin UI xuống SQL Server.

Module chọn để học: **Quản lý xe máy/phụ tùng**.

Route admin liên quan:

```text
/motorcycles -> ProductList productType="XeMay"
/parts       -> ProductList productType="PhuTung"
```

## I. Bức tranh tổng thể

Khi admin mở trang quản lý sản phẩm:

```text
App.jsx route
-> ProtectedRoute
-> MainLayout
-> ProductList.jsx
-> productService.getAll(params)
-> api.js
-> API Gateway
-> ProductsController.Search()
-> CatalogService.SearchProductsAsync()
-> ProductRepository.SearchAsync()
-> AppDbContext.Products
-> SQL Server
-> trả ProductListItem DTO
-> productService normalizeProduct()
-> ProductList setProducts()
-> render table
```

Khi admin thêm sản phẩm:

```text
ProductList bấm "Thêm xe máy/phụ tùng"
-> setShowForm(true)
-> ProductForm mở modal
-> admin nhập dữ liệu
-> handleSubmit()
-> validate()
-> productService.create(payload)
-> ProductsController.Create()
-> CatalogService.CreateProductAsync()
-> ProductRepository.Add(product)
-> SaveChangesAsync()
-> SQL Server insert Product + Sku mặc định
-> ProductForm gọi onSaved()
-> ProductList fetchProducts()
```

Khi admin xoá sản phẩm:

```text
ProductList bấm icon thùng rác
-> handleDelete()
-> window.confirm()
-> productService.delete(id)
-> ProductsController.Delete()
-> CatalogService.DeleteProductAsync()
-> product.Status = Inactive
-> SaveChangesAsync()
-> reload danh sách
```

Lưu ý: xoá sản phẩm ở đây là **soft delete/ngừng kinh doanh**, không xoá cứng khỏi database.

## II. File `ProductList.jsx`

File:

```text
frontend-admin/src/pages/products/ProductList.jsx
```

Vai trò:

- Là trang danh sách sản phẩm.
- Dùng chung cho xe máy và phụ tùng.
- Quản lý state lọc/tìm kiếm/phân trang.
- Gọi API lấy danh sách.
- Mở form thêm/sửa.
- Mở các modal phụ: ảnh, biến thể, tương thích, barcode, khuyến mại.

### 1. `PAGE_CONFIG`

`PAGE_CONFIG` quyết định trang đang là xe máy hay phụ tùng.

```js
const PAGE_CONFIG = {
  XeMay: { ... },
  PhuTung: { ... },
};
```

Ý nghĩa:

```text
Nếu productType = XeMay:
  title = Quản lý xe máy
  hiện hãng xe
  hiện biến thể

Nếu productType = PhuTung:
  title = Quản lý phụ tùng
  hiện hãng sản xuất phụ tùng
  không hiện biến thể xe máy
```

Vì vậy cùng một component `ProductList` nhưng dùng được cho 2 route:

```jsx
<ProductList productType="XeMay" />
<ProductList productType="PhuTung" />
```

### 2. State chính trong `ProductList`

Nhóm dữ liệu:

```js
const [products, setProducts] = useState([]);
const [categories, setCategories] = useState([]);
const [brands, setBrands] = useState([]);
const [manufacturers, setManufacturers] = useState([]);
```

Nhóm trạng thái UI:

```js
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

Nhóm filter:

```js
const [search, setSearch] = useState('');
const [filterCategory, setFilterCategory] = useState('');
const [filterBrand, setFilterBrand] = useState('');
const [filterStatus, setFilterStatus] = useState('');
const [filterStockStatus, setFilterStockStatus] = useState('');
const [filterPromotion, setFilterPromotion] = useState('');
const [minPrice, setMinPrice] = useState('');
const [maxPrice, setMaxPrice] = useState('');
```

Nhóm phân trang:

```js
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [totalItems, setTotalItems] = useState(0);
const pageSize = 10;
```

Nhóm modal/form:

```js
const [showForm, setShowForm] = useState(false);
const [editProduct, setEditProduct] = useState(null);
const [showVariants, setShowVariants] = useState(null);
const [showImages, setShowImages] = useState(null);
```

Cách hiểu:

```text
products          dữ liệu bảng
loading/error     trạng thái khi gọi API
search/filter     điều kiện gửi lên backend
page              trang hiện tại
showForm          có mở modal ProductForm không
editProduct       null là thêm mới, có product là sửa
```

### 3. `fetchProducts`

Đây là hàm quan trọng nhất của trang list.

Nhiệm vụ:

```text
1. Bật loading.
2. Gom filter/page thành params.
3. Gọi productService.getAll(params).
4. Nhận response.
5. setProducts, setTotalPages, setTotalItems.
6. Nếu lỗi thì setError.
7. Tắt loading.
```

Đoạn tạo params:

```js
const params = {
  page,
  pageSize,
  loaiSanPham: productType,
  keyword: search || undefined,
  maDanhMuc: filterCategory || undefined,
  maHangXe: config.showBrand ? filterBrand || undefined : undefined,
  trangThaiSanPham: filterStatus || undefined,
  stockStatus: filterStockStatus || undefined,
  hasPromotion: filterPromotion === '' ? undefined : filterPromotion === 'true',
  minPrice: minPrice === '' ? undefined : Number(minPrice),
  maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
};
```

Điểm quan trọng:

- Frontend dùng tên Việt như `loaiSanPham`, `maDanhMuc`, `maHangXe`.
- Nhưng backend DTO dùng `kind`, `categoryId`, `brandId`.
- Việc chuyển tên Việt sang tên backend nằm ở `productService.mapProductSearchParams`.

Đoạn gọi API:

```js
const res = await productService.getAll(params);
```

Sau đó set dữ liệu:

```js
setProducts(data.items || data.data || []);
setTotalPages(data.totalPages || ...);
setTotalItems(data.totalItems || ...);
```

### 4. `fetchFilters`

Hàm này lấy dữ liệu cho dropdown filter:

```text
categoryService.getAll()
brandService.getAll()
manufacturerService.getAll()
```

Ý nghĩa:

- Danh mục để lọc/chọn danh mục.
- Hãng xe để lọc/chọn hãng.
- Hãng sản xuất để chọn khi là phụ tùng.

### 5. `useEffect`

Có 3 nhóm effect chính:

Lần đầu vào trang:

```js
useEffect(() => {
  fetchFilters();
}, []);
```

Khi đổi giữa xe máy/phụ tùng:

```js
useEffect(() => {
  setPage(1);
  setFilterCategory('');
  ...
  setShowForm(false);
}, [productType]);
```

Khi filter/page thay đổi thì tải lại sản phẩm:

```js
useEffect(() => {
  fetchProducts();
}, [fetchProducts]);
```

### 6. `openAdd`, `openEdit`

Thêm mới:

```js
const openAdd = () => {
  setEditProduct(null);
  setShowForm(true);
};
```

Sửa:

```js
const openEdit = (product) => {
  setEditProduct(product);
  setShowForm(true);
};
```

Ý nghĩa:

```text
editProduct = null  -> ProductForm hiểu là thêm mới
editProduct = data  -> ProductForm hiểu là sửa
```

### 7. `handleDelete`

```js
const handleDelete = async (id, name) => {
  if (!window.confirm(...)) return;
  await productService.delete(id);
  fetchProducts();
};
```

Ý nghĩa:

- FE confirm trước.
- Gọi DELETE.
- Backend không xoá cứng mà chuyển status sang Inactive.
- FE reload danh sách.

## III. File `ProductForm.jsx`

File:

```text
frontend-admin/src/pages/products/ProductForm.jsx
```

Vai trò:

- Form thêm/sửa sản phẩm.
- Quản lý state form.
- Validate trước khi gửi.
- Gọi `productService.create` hoặc `productService.update`.
- Upload ảnh chính nếu có file.

### 1. `isEdit`

```js
const isEdit = !!product;
```

Ý nghĩa:

```text
Có product truyền vào -> đang sửa.
Không có product -> thêm mới.
```

### 2. State `form`

```js
const [form, setForm] = useState({
  maSP: '',
  tenSanPham: '',
  slug: '',
  loaiSP: 'XeMay',
  danhMucId: '',
  hangXeId: '',
  dongXeId: '',
  hangSXId: '',
  moTaNgan: '',
  giaGoc: '',
  giaKhuyenMai: '',
  trangThai: 'Available',
  noiBat: false,
  hotDeal: false,
});
```

Đây là dữ liệu người dùng nhập trên form.

### 3. Effect nạp dữ liệu khi sửa

Nếu `product` có dữ liệu, form sẽ đổ dữ liệu cũ vào state:

```js
if (product) {
  setForm({
    maSP: product.maSanPhamKinhDoanh || ...,
    tenSanPham: product.tenSanPham || product.name || '',
    ...
  });
}
```

Nếu không có `product`, reset về form rỗng.

### 4. `handleChange`

```js
const handleChange = (e) => {
  const { name, value } = e.target;
  setForm((prev) => {
    const updated = { ...prev, [name]: value };
    if (name === 'tenSanPham') {
      updated.slug = generateSlug(value);
    }
    ...
    return updated;
  });
};
```

Nhiệm vụ:

- Cập nhật state theo input.
- Nếu đổi tên sản phẩm thì tự tạo slug.
- Nếu đổi loại sản phẩm thì reset danh mục/hãng liên quan.
- Nếu đổi hãng xe thì reset dòng xe.

### 5. `validate`

```js
const validate = () => {
  const errs = {};
  if (!form.tenSanPham.trim()) errs.tenSanPham = 'Tên sản phẩm là bắt buộc';
  if (!form.giaGoc || Number(form.giaGoc) <= 0) errs.giaGoc = 'Giá gốc phải lớn hơn 0';
  if (!form.danhMucId) errs.danhMucId = 'Vui lòng chọn danh mục';
  setErrors(errs);
  return Object.keys(errs).length === 0;
};
```

Ý nghĩa:

- FE validate trước để tránh gửi dữ liệu sai.
- Backend vẫn validate lại trong `CatalogService`.
- Không được chỉ tin frontend.

### 6. `handleSubmit`

Đây là hàm quan trọng nhất của ProductForm.

Luồng:

```text
1. Chặn reload form bằng e.preventDefault().
2. Gọi validate().
3. Nếu lỗi thì dừng.
4. Bật saving.
5. Tạo payload.
6. Nếu edit thì gọi productService.update.
7. Nếu thêm mới thì gọi productService.create.
8. Nếu có ảnh file thì uploadImage.
9. Gọi onSaved().
10. Tắt saving.
```

Payload frontend tạo:

```js
const payload = {
  maSanPhamKinhDoanh: form.maSP || undefined,
  tenSanPham: form.tenSanPham,
  slug: form.slug || undefined,
  loaiSanPham: form.loaiSP,
  maDanhMuc: Number(form.danhMucId),
  maHangXe: ...,
  maDongXe: ...,
  maHangSanXuat: ...,
  moTaNgan: form.moTaNgan || undefined,
  giaGoc: Number(form.giaGoc) || 0,
  giaKhuyenMai: Number(form.giaKhuyenMai) || null,
  trangThaiSanPham: form.trangThai,
  noiBat: !!form.noiBat,
  hotDeal: !!form.hotDeal,
};
```

Điểm quan trọng:

- Payload ở frontend dùng tên Việt.
- `productService.mapProductPayload` sẽ đổi sang tên backend.

## IV. File `productService.js`

File:

```text
frontend-admin/src/services/productService.js
```

Vai trò:

- Là cầu nối giữa Admin page và API.
- Map dữ liệu frontend sang backend.
- Normalize dữ liệu backend trả về cho frontend.

### 1. `normalizeProduct`

Backend trả về field tiếng Anh:

```text
id, code, name, categoryId, brandId, kind, listPrice, salePrice, stockTotal, status
```

Frontend nhiều chỗ dùng field tiếng Việt:

```text
maSanPham, maSanPhamKinhDoanh, tenSanPham, maDanhMuc, maHangXe, giaGoc, giaKhuyenMai
```

`normalizeProduct` làm nhiệm vụ ghép hai kiểu lại:

```js
maSanPham: product.maSanPham ?? product.id
tenSanPham: product.tenSanPham ?? product.name
giaGoc: product.giaGoc ?? product.listPrice ?? 0
```

Ý nghĩa:

```text
Dù backend trả tiếng Anh hay dữ liệu cũ trả tiếng Việt,
frontend vẫn đọc được.
```

### 2. `mapProductSearchParams`

Frontend gửi:

```text
loaiSanPham = XeMay / PhuTung
maDanhMuc
maHangXe
trangThaiSanPham
```

Backend cần:

```text
kind = 1 / 2
categoryId
brandId
status = 1 / 0 / -1
```

Hàm này đổi:

```js
kind: params.loaiSanPham === 'PhuTung' ? 2 : params.loaiSanPham === 'XeMay' ? 1 : undefined
categoryId: params.categoryId ?? params.maDanhMuc
brandId: params.brandId ?? params.maHangXe
```

Đây là đoạn rất quan trọng để trả lời khi bị hỏi:

```text
Frontend Admin có thể dùng tên field dễ hiểu theo UI,
productService sẽ map sang DTO backend.
```

### 3. `mapProductPayload`

Frontend gửi payload tiếng Việt:

```text
tenSanPham, maDanhMuc, maHangXe, loaiSanPham, giaGoc
```

Backend DTO cần:

```text
name, categoryId, brandId, kind, listPrice
```

`mapProductPayload` đổi dữ liệu:

```js
name: data.name ?? data.tenSanPham
categoryId: Number(data.categoryId ?? data.maDanhMuc)
brandId: data.brandId ?? data.maHangXe ?? null
kind: data.kind ?? (data.loaiSanPham === 'PhuTung' ? 2 : 1)
listPrice: Number(data.listPrice ?? data.giaGoc) || 0
```

### 4. Các hàm CRUD chính

```js
getAll: (params) => api.get('/products', { params: mapProductSearchParams(params) })
getById: (id) => api.get(`/products/${id}`)
create: (data) => api.post('/products', mapProductPayload(data, true))
update: (id, data) => api.put(`/products/${id}`, mapProductPayload(data))
delete: (id) => api.delete(`/products/${id}`)
```

Giải thích:

- `getAll`: lấy danh sách.
- `getById`: lấy chi tiết.
- `create`: thêm sản phẩm, có gửi code/kind/listPrice.
- `update`: sửa sản phẩm.
- `delete`: gọi xoá/ngừng kinh doanh.

## V. File `ProductsController.cs`

File:

```text
backend/src/MoToSale.APIService/Controllers/ProductsController.cs
```

Vai trò:

- Nhận HTTP request từ frontend.
- Gọi `ICatalogService`.
- Trả response.
- Gắn phân quyền bằng `[Authorize]`.

### 1. Route controller

```csharp
[Route("api/products")]
```

Nghĩa là endpoint sản phẩm bắt đầu bằng:

```text
/api/products
```

### 2. `Search`

```csharp
[HttpGet]
public async Task<IActionResult> Search([FromQuery] ProductSearchRequest request) =>
    Ok(await _catalog.SearchProductsAsync(request));
```

Request:

```text
GET /api/products?page=1&pageSize=10&kind=1
```

Luồng:

```text
Controller nhận query
-> bind vào ProductSearchRequest
-> gọi CatalogService.SearchProductsAsync
-> trả kết quả paging
```

### 3. `Create`

```csharp
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[HttpPost]
public async Task<IActionResult> Create(CreateProductRequest request)
{
    try { return Ok(new { id = await _catalog.CreateProductAsync(request) }); }
    catch (CatalogException ex) { return BadRequest(new { message = ex.Message }); }
}
```

Ý nghĩa:

- Chỉ Admin/Staff được thêm.
- Nhận `CreateProductRequest`.
- Gọi service tạo sản phẩm.
- Nếu lỗi nghiệp vụ thì trả `400 BadRequest`.

### 4. `Update`

```csharp
[Authorize(Roles = StaffRoles)]
[HttpPut("{id:int}")]
public async Task<IActionResult> Update(int id, UpdateProductRequest request)
```

Ý nghĩa:

- URL có id.
- Body là dữ liệu sửa.
- Gọi `UpdateProductAsync(id, request)`.

### 5. `Delete`

```csharp
[Authorize(Roles = RoleConstant.Admin)]
[HttpDelete("{id:int}")]
public async Task<IActionResult> Delete(int id)
```

Ý nghĩa:

- Chỉ Admin được xoá/ngừng kinh doanh.
- Staff không được xoá.
- Gọi `DeleteProductAsync`.

## VI. File `CatalogService.cs`

File:

```text
backend/src/MoToSale.Services/Catalog/CatalogService.cs
```

Vai trò:

- Xử lý nghiệp vụ catalog.
- Validate dữ liệu.
- Tạo entity.
- Update entity.
- Gọi repository.
- Mapping sang DTO.

### 1. `SearchProductsAsync`

```csharp
public async Task<PagingResponse<ProductListItem>> SearchProductsAsync(ProductSearchRequest request)
{
    var page = await _products.SearchAsync(request);
    var mfg = await ManufacturerMapAsync();
    var skuIds = page.Items.SelectMany(p => p.Skus.Select(s => s.Id)).ToList();
    var onHand = await _inventory.GetOnHandBySkusAsync(skuIds);
    return new PagingResponse<ProductListItem>
    {
        Items = page.Items.Select(p => MapListItem(...)).ToList(),
        Page = page.Page,
        PageSize = page.PageSize,
        TotalItems = page.TotalItems,
    };
}
```

Nhiệm vụ:

```text
1. Gọi ProductRepository.SearchAsync để query sản phẩm.
2. Lấy tên hãng sản xuất.
3. Lấy tồn kho theo SKU.
4. Map Product entity sang ProductListItem DTO.
5. Trả PagingResponse cho frontend.
```

### 2. `CreateProductAsync`

```csharp
public async Task<int> CreateProductAsync(CreateProductRequest r)
```

Nhiệm vụ:

```text
1. Kiểm tra tên sản phẩm bắt buộc.
2. Kiểm tra giá niêm yết > 0.
3. Tạo code nếu không nhập.
4. Kiểm tra code trùng.
5. Tạo slug nếu không nhập.
6. Kiểm tra slug trùng.
7. Tạo Product entity.
8. Tạo SKU mặc định.
9. Add product.
10. SaveChanges.
11. Trả product.Id.
```

Đoạn validate:

```csharp
if (string.IsNullOrWhiteSpace(r.Name))
    throw new CatalogException("Tên sản phẩm là bắt buộc.");

if (r.ListPrice <= 0)
    throw new CatalogException("Giá niêm yết phải lớn hơn 0.");
```

Đoạn tạo Product:

```csharp
var product = new Product
{
    Code = code,
    Name = r.Name.Trim(),
    Slug = slug,
    CategoryId = r.CategoryId,
    BrandId = r.Kind == (int)ProductKind.Part ? null : r.BrandId,
    VehicleModelId = r.Kind == (int)ProductKind.Part ? null : r.VehicleModelId,
    Kind = r.Kind,
    ManufacturerId = r.Kind == (int)ProductKind.Part ? r.ManufacturerId : null,
    IsFeatured = r.IsFeatured,
    IsHotDeal = r.IsHotDeal,
    CreatedDate = now,
    Status = (int)EntityStatus.Active,
    Skus =
    {
        new Sku
        {
            SkuCode = $"{code}-DEFAULT",
            VariantName = "Mặc định",
            ListPrice = r.ListPrice,
            SalePrice = r.SalePrice,
            CreatedDate = now,
            Status = (int)EntityStatus.Active,
        },
    },
};
```

Điểm cần nhớ:

```text
Tạo sản phẩm cũng tạo luôn SKU mặc định.
Giá thật nằm ở SKU, không trực tiếp ở Product entity.
```

### 3. `UpdateProductAsync`

Nhiệm vụ:

```text
1. Tìm product theo id.
2. Nếu không thấy thì lỗi.
3. Validate giá.
4. Cập nhật tên, slug, danh mục, hãng, mô tả, trạng thái.
5. Update product.
6. Cập nhật base SKU nếu cần.
7. SaveChanges.
```

Điểm khác create:

```text
CreateProductRequest có Code và Kind.
UpdateProductRequest không đổi Code/Kind.
```

### 4. `DeleteProductAsync`

```csharp
product.Status = (int)EntityStatus.Inactive;
product.UpdatedDate = DateTime.UtcNow;
_products.Update(product);
await _products.SaveChangesAsync();
```

Ý nghĩa:

```text
Không xoá khỏi DB.
Chỉ chuyển Status sang Inactive.
Giữ lịch sử đơn hàng/tồn kho/liên kết.
```

## VII. File `ProductRepository.cs`

File:

```text
backend/src/MoToSale.Repository/Catalog/ProductRepository.cs
```

Vai trò:

- Chứa query sản phẩm.
- Dùng EF Core LINQ.
- Include SKU/Images.
- Apply search/filter/sort/paging.

### `SearchAsync`

Luồng:

```text
1. Bắt đầu từ Query.AsNoTracking().
2. Include Skus.
3. Include Images.
4. Lọc status active hoặc status theo request.
5. Lọc keyword/category/brand/kind/price/stock/promotion.
6. Sort.
7. Count total.
8. Skip/Take phân trang.
9. Trả PagingResponse<Product>.
```

Ví dụ filter keyword:

```csharp
if (!string.IsNullOrWhiteSpace(r.Keyword))
    query = query.Where(p => p.Name.Contains(r.Keyword!) || p.Code.Contains(r.Keyword!));
```

Filter category:

```csharp
if (r.CategoryId.HasValue)
    query = query.Where(p => p.CategoryId == r.CategoryId || p.Category.ParentId == r.CategoryId);
```

Phân trang:

```csharp
var total = await query.CountAsync();
var items = await query.Skip((r.Page - 1) * r.PageSize).Take(r.PageSize).ToListAsync();
```

Điểm cần nhớ:

```text
Frontend chỉ gửi page/pageSize/filter.
Backend mới là nơi query và phân trang thật.
```

## VIII. Entity, DTO, DbContext

### 1. `Product` Entity

File:

```text
backend/src/MoToSale.Entities/Catalog/Product.cs
```

Entity có các field:

```csharp
public string Code { get; set; }
public string Name { get; set; }
public string Slug { get; set; }
public int CategoryId { get; set; }
public int? BrandId { get; set; }
public int? VehicleModelId { get; set; }
public int? ManufacturerId { get; set; }
public int Kind { get; set; }
public bool IsFeatured { get; set; }
public bool IsHotDeal { get; set; }
```

Quan hệ:

```csharp
public Category Category { get; set; }
public Brand? Brand { get; set; }
public VehicleModel? VehicleModel { get; set; }
public ICollection<Sku> Skus { get; set; }
public ICollection<ProductImage> Images { get; set; }
```

Vì `Product` kế thừa `BaseEntity`, nó còn có:

```text
Id
CreatedDate
UpdatedDate
Status
```

### 2. DTO

File:

```text
backend/src/MoToSale.DTO/Catalog/CatalogDtos.cs
```

Search request:

```csharp
public class ProductSearchRequest : PagingRequest
{
    public int? CategoryId { get; set; }
    public int? BrandId { get; set; }
    public int? Kind { get; set; }
    public int? Status { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? StockStatus { get; set; }
    public bool? HasPromotion { get; set; }
}
```

List response:

```csharp
public record ProductListItem(...);
```

Create request:

```csharp
public record CreateProductRequest(
    string Code,
    string Name,
    string? Slug,
    int CategoryId,
    int? BrandId,
    int? VehicleModelId,
    int Kind,
    ...
    decimal ListPrice,
    decimal? SalePrice,
    int? ManufacturerId = null);
```

Update request:

```csharp
public record UpdateProductRequest(...);
```

### 3. `AppDbContext`

File:

```text
backend/src/MoToSale.Repository/AppDbContext.cs
```

DbSet:

```csharp
public DbSet<Product> Products => Set<Product>();
public DbSet<Sku> Skus => Set<Sku>();
public DbSet<ProductImage> ProductImages => Set<ProductImage>();
```

Cấu hình Product:

```csharp
b.Entity<Product>(e =>
{
    e.ToTable("Products");
    e.Property(x => x.Code).HasMaxLength(50).IsRequired();
    e.Property(x => x.Name).HasMaxLength(255).IsRequired();
    e.Property(x => x.Slug).HasMaxLength(280).IsRequired();
    e.HasIndex(x => x.Code).IsUnique();
    e.HasIndex(x => x.Slug).IsUnique();
    e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId);
});
```

Ý nghĩa:

```text
AppDbContext quyết định Product map xuống bảng Products như thế nào,
cột nào required,
cột nào unique,
quan hệ khóa ngoại ra sao.
```

## IX. Trả lời mẫu theo luồng thật

### Câu: Khi admin mở trang Quản lý xe máy, dữ liệu đi như thế nào?

```text
Route /motorcycles trong App.jsx render ProductList với productType là XeMay. ProductList chạy fetchProducts, gom page, pageSize, keyword, danh mục, hãng, trạng thái thành params rồi gọi productService.getAll. Trong productService, mapProductSearchParams chuyển loaiSanPham = XeMay thành kind = 1, maDanhMuc thành categoryId, maHangXe thành brandId. Sau đó api.js gửi GET /api/products kèm query params và tự gắn JWT token. Request đi qua API Gateway vào ProductsController.Search. Controller bind query vào ProductSearchRequest và gọi CatalogService.SearchProductsAsync. Service gọi ProductRepository.SearchAsync để query Products, Include Skus/Images, filter, sort, phân trang. Service map Product entity sang ProductListItem DTO, tính thêm tồn kho, rồi trả về frontend. ProductList setProducts và render bảng.
```

### Câu: Khi admin thêm sản phẩm, dữ liệu đi như thế nào?

```text
Admin bấm Thêm xe máy, ProductList setShowForm(true) và editProduct = null nên ProductForm mở ở chế độ thêm mới. Người dùng nhập dữ liệu, handleSubmit của ProductForm gọi validate. Nếu hợp lệ, form tạo payload với các field như tenSanPham, loaiSanPham, maDanhMuc, maHangXe, giaGoc. ProductForm gọi productService.create. Trong productService, mapProductPayload đổi field frontend sang field backend như name, kind, categoryId, brandId, listPrice. Request POST /api/products đi qua Gateway vào ProductsController.Create. Controller yêu cầu role Admin/Staff và gọi CatalogService.CreateProductAsync. Service validate tên, giá, code, slug, tạo Product entity và SKU mặc định, gọi _products.Add rồi SaveChangesAsync. EF Core insert dữ liệu xuống SQL Server và trả id sản phẩm về frontend.
```

### Câu: Khi admin xoá sản phẩm, DB có xoá không?

```text
Không xoá cứng. ProductList gọi productService.delete, backend ProductsController.Delete gọi CatalogService.DeleteProductAsync. Trong service, product.Status được đổi thành Inactive và UpdatedDate được cập nhật. Sau đó SaveChangesAsync. Vì vậy DB vẫn giữ record sản phẩm để không mất lịch sử đơn hàng, tồn kho hoặc các liên kết cũ.
```

## X. Cách học file này

Đọc theo thứ tự:

1. `ProductList.jsx`: hiểu UI và state.
2. `productService.js`: hiểu map dữ liệu FE -> BE.
3. `ProductsController.cs`: hiểu endpoint.
4. `CatalogService.cs`: hiểu nghiệp vụ.
5. `ProductRepository.cs`: hiểu query.
6. `Product.cs` + `CatalogDtos.cs` + `AppDbContext.cs`: hiểu DB/DTO.

Sau đó tự vẽ lại 3 luồng:

```text
Load danh sách
Thêm sản phẩm
Xoá sản phẩm
```
