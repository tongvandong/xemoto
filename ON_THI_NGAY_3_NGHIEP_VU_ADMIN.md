# Đề cương ôn thi Ngày 3 - Nghiệp vụ Admin: Đơn hàng, Voucher và Tồn kho

## I. Mục tiêu trong ngày

Bạn phụ trách **Backend và Frontend Admin**, nên Ngày 3 tập trung vào các nghiệp vụ quản trị thật sự của hệ thống:

- Quản lý đơn hàng.
- Tạo đơn bán tại quầy POS.
- Cập nhật trạng thái đơn hàng.
- Ghi nhận và xác nhận thanh toán.
- Quản lý voucher.
- Quản lý tồn kho, phiếu kho, giữ chỗ và xuất/nhập kho.

Sau khi học xong Ngày 3, cần trả lời được:

- Admin xem danh sách đơn hàng như thế nào?
- Admin xem chi tiết đơn hàng và cập nhật trạng thái như thế nào?
- POS tạo đơn bán tại quầy đi qua những file nào?
- Trạng thái đơn hàng khác trạng thái thanh toán như thế nào?
- Voucher được tạo, sửa, xoá và validate như thế nào?
- Tồn kho thực tế, tồn đang giữ và tồn khả dụng khác nhau ra sao?
- Khi tạo đơn, giao hàng, huỷ đơn thì tồn kho thay đổi như thế nào?
- Nếu giảng viên xoá một hàm nhỏ trong order/voucher/inventory, có thể viết lại theo luồng không?

## II. Tổng quan nghiệp vụ Ngày 3

Ngày 1 học luồng đăng nhập.  
Ngày 2 học CRUD sản phẩm.  
Ngày 3 học các nghiệp vụ nối với nhau trong admin:

```text
Sản phẩm/SKU
-> Tồn kho
-> POS hoặc đơn online
-> Voucher
-> Thanh toán
-> Giao hàng/xuất kho
-> Lịch sử trạng thái/audit
```

Ba nhóm chính cần nắm:

| Nhóm | Ý nghĩa | Mục tiêu khi thi |
|---|---|---|
| Orders | Quản lý đơn hàng, POS, trạng thái, thanh toán, giao hàng | Hiểu luồng từ Admin FE xuống OrderService |
| Vouchers | Tạo mã giảm giá, kiểm tra điều kiện áp dụng | Hiểu validate voucher và ảnh hưởng tới tổng tiền |
| Inventory | Quản lý tồn kho, phiếu kho, giữ chỗ, điều chỉnh tồn | Hiểu `OnHand`, `Reserved`, `Available` và xuất/nhập kho |

Luồng tổng quát cần thuộc:

```text
Frontend Admin Page
-> service JS
-> api.js gắn JWT
-> API Gateway
-> Controller
-> Service
-> Repository/AppDbContext
-> SQL Server
```

## III. Các file cần nắm

### 1. Frontend Admin - Orders

| File | Vai trò |
|---|---|
| `frontend-admin/src/pages/orders/OrderList.jsx` | Danh sách đơn hàng, lọc/tìm kiếm, chuyển sang chi tiết |
| `frontend-admin/src/pages/orders/OrderDetail.jsx` | Chi tiết đơn, cập nhật trạng thái, thanh toán, huỷ, sửa đơn |
| `frontend-admin/src/pages/orders/PosOrder.jsx` | Tạo đơn bán tại quầy POS |
| `frontend-admin/src/services/orderService.js` | Gom API đơn hàng cho admin |
| `frontend-admin/src/services/paymentService.js` | Ghi nhận/xác nhận thanh toán trong chi tiết đơn |
| `frontend-admin/src/utils/statusMappings.js` | Map trạng thái sang nhãn/màu hiển thị |

### 2. Frontend Admin - Voucher

| File | Vai trò |
|---|---|
| `frontend-admin/src/pages/vouchers/VoucherList.jsx` | Danh sách, form tạo/sửa/xoá voucher |
| `frontend-admin/src/services/voucherService.js` | Gọi API voucher và normalize dữ liệu |

### 3. Frontend Admin - Inventory

| File | Vai trò |
|---|---|
| `frontend-admin/src/pages/inventory/InventoryView.jsx` | Xem tồn kho, lọc, đồng bộ, điều chỉnh tồn, cập nhật ngưỡng thấp |
| `frontend-admin/src/pages/inventory/StockDocumentList.jsx` | Quản lý phiếu kho, tạo phiếu, duyệt phiếu, huỷ phiếu |
| `frontend-admin/src/services/inventoryService.js` | Gọi API tồn kho/phiếu kho |

### 4. Backend - Orders

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.APIService/Controllers/OrdersController.cs` | Nhận request đơn hàng từ frontend |
| `backend/src/MoToSale.Services/Ordering/OrderService.cs` | Xử lý nghiệp vụ đơn hàng, POS, giữ/xuất kho, huỷ đơn |
| `backend/src/MoToSale.Services/Ordering/IOrderService.cs` | Interface của OrderService |
| `backend/src/MoToSale.Repository/Ordering/OrderRepository.cs` | Truy vấn đơn hàng từ database |
| `backend/src/MoToSale.DTO/Ordering/OrderingDtos.cs` | DTO request/response của đơn hàng và voucher |
| `backend/src/MoToSale.Entities/Ordering/Order.cs` | Entity Order, OrderLine, Allocation, OrderStatusHistory |
| `backend/src/MoToSale.Common/OrderEnums.cs` | Hằng số trạng thái đơn, thanh toán, fulfillment |

### 5. Backend - Voucher

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.APIService/Controllers/VouchersController.cs` | API voucher |
| `backend/src/MoToSale.Services/Ordering/VoucherService.cs` | Xử lý tạo/sửa/xoá/validate voucher |
| `backend/src/MoToSale.Services/Ordering/IVoucherService.cs` | Interface voucher |
| `backend/src/MoToSale.Repository/Ordering/VoucherRepository.cs` | Truy vấn voucher |
| `backend/src/MoToSale.Entities/Ordering/Voucher.cs` | Entity Voucher, VoucherScope, VoucherRedemption, OrderVoucher |

### 6. Backend - Inventory

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.APIService/Controllers/InventoryController.cs` | API tồn kho, phiếu kho, điều chỉnh tồn |
| `backend/src/MoToSale.Services/Inventory/InventoryService.cs` | Xử lý nghiệp vụ tồn kho |
| `backend/src/MoToSale.Services/Inventory/IInventoryService.cs` | Interface tồn kho |
| `backend/src/MoToSale.Repository/Inventory/InventoryRepository.cs` | Truy vấn tồn kho |
| `backend/src/MoToSale.Repository/Inventory/StockDocumentRepository.cs` | Truy vấn phiếu kho |
| `backend/src/MoToSale.Entities/Inventory/InventoryItem.cs` | Entity dòng tồn kho theo SKU |
| `backend/src/MoToSale.Entities/Inventory/Reservation.cs` | Entity giữ chỗ tồn kho cho đơn |
| `backend/src/MoToSale.Entities/Inventory/StockDocument.cs` | Entity phiếu kho |
| `backend/src/MoToSale.Entities/Inventory/StockMovement.cs` | Entity lịch sử biến động kho |

## IV. Luồng Orders cần thuộc

### 1. Luồng xem danh sách đơn hàng

```text
OrderList.jsx
-> fetch orders
-> orderService.getAll(params)
-> api.get('/orders', { params })
-> request thật: /api/orders
-> OrdersController.Search(OrderSearchRequest request)
-> OrderService.SearchOrdersAsync(request)
-> OrderRepository/Search query hoặc AppDbContext
-> trả PagingResponse<OrderListItem>
-> OrderList.jsx set state và render table
```

Cần nói được:

```text
Trang danh sách đơn không tự truy vấn database.
Nó chỉ giữ state filter/page/loading, gọi orderService.
Backend nhận query qua Controller, Service xử lý nghiệp vụ và Repository/DbContext truy vấn dữ liệu.
```

### 2. Luồng xem chi tiết đơn hàng

```text
OrderDetail.jsx
-> lấy id từ URL
-> orderService.getById(id)
-> api.get('/orders/{id}')
-> OrdersController.GetById(id)
-> OrderService.GetOrderAsync(id)
-> trả OrderDetail
-> FE render thông tin khách, dòng hàng, thanh toán, tồn giữ, lịch sử
```

Điểm quan trọng:

- `OrderDetail.jsx` là trang nghiệp vụ nặng nhất của orders.
- Trang này không chỉ hiển thị đơn, mà còn có hành động:
  - cập nhật trạng thái đơn;
  - ghi nhận thanh toán;
  - xác nhận thanh toán chuyển khoản;
  - huỷ thanh toán chờ;
  - sửa thông tin đơn;
  - huỷ đơn;
  - in đơn hoặc hoá đơn.

### 3. Luồng cập nhật trạng thái đơn

```text
OrderDetail.jsx
-> handleUpdateStatus()
-> orderService.updateStatus(id, { toStatus, note })
-> PUT /api/orders/{id}/status
-> OrdersController.UpdateStatus(id, request)
-> OrderService.UpdateStatusAsync(id, request, userId)
-> cập nhật OrderStatus
-> thêm OrderStatusHistory
-> lưu database
-> FE fetchOrder() để tải lại đơn
```

Nếu trạng thái là `Cancelled`, frontend gọi riêng:

```text
orderService.cancel(id, { reason })
-> POST /api/orders/{id}/cancel
-> OrderService.CancelOrderAsync(...)
```

Khi huỷ đơn, backend cần xử lý thêm:

- đổi trạng thái đơn sang `Cancelled`;
- giải phóng tồn đang giữ;
- nếu đã xuất kho thì có thể hoàn tồn;
- ghi lịch sử trạng thái;
- ghi audit log.

### 4. Luồng tạo đơn POS

```text
PosOrder.jsx
-> chọn/tìm SKU
-> thêm vào giỏ POS
-> nhập khách hàng, voucher, phương thức thanh toán, số tiền đã trả
-> handleSubmit()
-> orderService.createPos(payload)
-> POST /api/orders/pos
-> OrdersController.CreatePos(PosOrderRequest request)
-> OrderService.CreatePosOrderAsync(request, staffUserId)
-> kiểm tra tồn khả dụng
-> validate voucher nếu có
-> tạo Order, OrderLine
-> nếu bán đứt thì trừ OnHand và ghi StockMovement
-> nếu đặt cọc thì giữ chỗ Reserved
-> lưu database
-> trả id đơn hàng
```

Câu trả lời mẫu:

```text
POS là luồng admin/staff tạo đơn tại quầy. Frontend gom các dòng SKU, số lượng, giá, khách hàng, voucher và thanh toán thành payload. Backend qua OrdersController gọi OrderService.CreatePosOrderAsync. Service kiểm tra tồn khả dụng, validate voucher, tạo Order và OrderLine. Tuỳ loại đơn, hệ thống có thể trừ tồn ngay hoặc giữ chỗ tồn.
```

## V. Trạng thái cần hiểu

### 1. Trạng thái đơn hàng

Trong `OrderEnums.cs`, `OrderStatus` mô tả vòng đời đơn:

| Status | Ý nghĩa |
|---|---|
| `Pending` | Chờ xác nhận |
| `Shipping` | Đang xử lý/giao hàng |
| `Delivered` | Đã giao, hoàn tất bán hàng |
| `Cancelled` | Đã huỷ |

### 2. Trạng thái thanh toán

`PaymentStatus` là một trục riêng với đơn hàng:

| Status | Ý nghĩa |
|---|---|
| `Unpaid` | Chưa thanh toán |
| `PendingConfirmation` | Chờ xác nhận chuyển khoản |
| `Paid` | Đã thanh toán |
| `Refunded` | Đã hoàn tiền |
| `Failed` | Thanh toán thất bại |

### 3. Trạng thái fulfillment

`FulfillmentStatus` nói về xử lý hàng:

| Status | Ý nghĩa |
|---|---|
| `Unallocated` | Chưa phân bổ hàng |
| `Allocated` | Đã soạn/xuất hàng theo đơn |
| `Shipped` | Đã giao/đang vận chuyển |
| `Fulfilled` | Hoàn tất |

Điểm cần trả lời rõ:

```text
OrderStatus, PaymentStatus và FulfillmentStatus không giống nhau.
Một đơn có thể đã thanh toán nhưng chưa giao.
Một đơn cũng có thể đang giao nhưng thanh toán COD vẫn là Unpaid.
Vì vậy backend tách các trạng thái này để quản lý đúng nghiệp vụ.
```

## VI. Phân tích từng file Orders

### 1. `OrderList.jsx` - Danh sách đơn hàng

Chức năng:

- Lưu state danh sách đơn.
- Lưu state filter, page, loading, error.
- Gọi `orderService.getAll(params)`.
- Render bảng đơn hàng.
- Điều hướng sang chi tiết đơn.

Cần hiểu:

```text
OrderList là màn hình đọc dữ liệu nhiều dòng.
Nó không xử lý nghiệp vụ sâu.
Nghiệp vụ thật nằm ở backend OrderService.
```

Nếu bị xoá hàm tải danh sách, có thể viết lại theo ý:

```jsx
const fetchOrders = async () => {
  setLoading(true);
  try {
    const res = await orderService.getAll({ page, pageSize, keyword, status });
    setOrders(res.data.items || []);
  } finally {
    setLoading(false);
  }
};
```

### 2. `OrderDetail.jsx` - Chi tiết và xử lý đơn

State quan trọng:

- `order`: dữ liệu đơn hiện tại.
- `loading`: đang tải chi tiết.
- `showStatusModal`: mở modal cập nhật trạng thái.
- `showCancelModal`: mở modal huỷ đơn.
- `showPaymentModal`: mở modal ghi nhận thanh toán.
- `editForm`, `editLines`: dữ liệu sửa đơn.

Hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `fetchOrder` | Gọi API lấy chi tiết đơn |
| `handleUpdateStatus` | Cập nhật trạng thái đơn |
| `handleUpdatePaymentStatus` | Ghi nhận thanh toán |
| `handleConfirmPayment` | Xác nhận phiếu chuyển khoản |
| `handleCancelPendingPayment` | Huỷ phiếu thanh toán đang chờ |
| `handleUpdateOrder` | Sửa thông tin/dòng hàng của đơn |
| `handleCancel` | Huỷ đơn |

Cần hiểu:

```text
Mỗi lần cập nhật thành công, frontend gọi lại fetchOrder().
Lý do là dữ liệu đơn có thể thay đổi nhiều phần: trạng thái, thanh toán, tổng tiền, giữ chỗ, lịch sử.
```

### 3. `PosOrder.jsx` - Bán hàng tại quầy

Chức năng:

- Tìm SKU theo mã/tên/barcode.
- Thêm SKU vào giỏ bán tại quầy.
- Sửa số lượng, giá bán.
- Chọn khách hàng.
- Nhập voucher.
- Chọn phương thức thanh toán.
- Tạo đơn POS.

Payload gửi backend thường gồm:

```text
customerId/customer info
lines: skuId, qty, unitPrice
voucherCode
paymentMethod
paidAmount
orderType
receivingMethod
note
```

Điểm cần nhớ:

```text
Frontend POS chỉ kiểm tra cơ bản để người dùng không nhập sai.
Backend vẫn phải kiểm tra lại tồn kho, voucher và tổng tiền vì backend là nơi quyết định dữ liệu thật.
```

### 4. `orderService.js` - API đơn hàng của admin

Các hàm chính:

```js
getAll: (params) => api.get('/orders', { params })
getById: (id) => api.get(`/orders/${id}`)
createPos: (data) => api.post('/orders/pos', data)
update: (id, data) => api.put(`/orders/${id}`, data)
updateStatus: (id, data) => api.put(`/orders/${id}/status`, data)
updateFulfillmentStatus: (id, data) => api.put(`/orders/${id}/fulfillment-status`, data)
allocate: (id, data) => api.post(`/orders/${id}/allocate`, data)
fulfill: (id) => api.post(`/orders/${id}/fulfill`)
cancel: (id, data) => api.post(`/orders/${id}/cancel`, { reason: ... })
```

Cần trả lời:

```text
orderService là lớp trung gian ở frontend, giúp component không viết axios trực tiếp.
Component gọi orderService, còn orderService gọi api.js.
api.js sẽ tự gắn JWT vào header.
```

### 5. `OrdersController.cs` - API nhận request đơn hàng

Route chính:

```csharp
[Authorize]
[Route("api/orders")]
```

Các endpoint quan trọng:

| Endpoint | Hàm | Vai trò |
|---|---|---|
| `GET /api/orders` | `Search` | Admin/staff xem danh sách đơn |
| `GET /api/orders/{id}` | `GetById` | Xem chi tiết đơn |
| `POST /api/orders/pos` | `CreatePos` | Tạo đơn tại quầy |
| `PUT /api/orders/{id}` | `Update` | Sửa thông tin đơn |
| `PUT /api/orders/{id}/status` | `UpdateStatus` | Cập nhật trạng thái đơn |
| `POST /api/orders/{id}/cancel` | `Cancel` | Huỷ đơn |
| `POST /api/orders/{id}/allocate` | `Allocate` | Soạn/xuất hàng |
| `POST /api/orders/{id}/fulfill` | `Fulfill` | Hoàn tất giao hàng |

Điểm quan trọng:

- Controller không tự xử lý toàn bộ nghiệp vụ.
- Controller kiểm tra quyền, lấy user hiện tại, gọi Service.
- Nếu Service ném `OrderException`, Controller trả `BadRequest`.
- Sau một số hành động, Controller ghi `AuditLog`.

### 6. `OrderService.cs` - Nghiệp vụ đơn hàng

Đây là file cần học sâu nhất của Ngày 3.

Các hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `AvailableForSaleAsync` | Tính tồn khả dụng để bán |
| `CheckoutAsync` | Khách đặt hàng online |
| `CreatePosOrderAsync` | Admin/staff tạo đơn tại quầy |
| `SearchOrdersAsync` | Tìm kiếm danh sách đơn |
| `GetOrderAsync` | Lấy chi tiết đơn |
| `UpdateOrderAsync` | Sửa đơn |
| `CancelOrderAsync` | Huỷ đơn và xử lý tồn |
| `UpdateStatusAsync` | Cập nhật trạng thái đơn |
| `AllocateAsync` | Xuất/soạn hàng theo đơn |
| `FulfillAsync` | Hoàn tất giao hàng |

Công thức tồn khả dụng trong OrderService:

```text
AvailableForSale = OnHand - Reserved
```

Ý nghĩa:

- `OnHand`: số lượng thực tế trong kho.
- `Reserved`: số lượng đang giữ cho đơn chưa hoàn tất.
- `Available`: số lượng còn bán được.

Khi tạo đơn:

```text
Nếu số lượng đặt > AvailableForSale
-> báo lỗi "Số lượng tồn khả dụng không đủ"
```

Khi tạo đơn đặt cọc hoặc đơn chưa xuất ngay:

```text
Reserved tăng lên
Reservation được tạo
OnHand chưa giảm ngay
```

Khi giao/xuất hàng:

```text
OnHand giảm
Reserved được giải phóng
StockMovement được ghi lại
```

Khi huỷ đơn:

```text
Nếu đang giữ chỗ -> giảm Reserved
Nếu đã xuất kho -> hoàn OnHand nếu nghiệp vụ yêu cầu
Đổi OrderStatus sang Cancelled
Ghi lịch sử
```

## VII. Luồng Voucher cần thuộc

### 1. Luồng tạo voucher

```text
VoucherList.jsx
-> submit form
-> voucherService.create(form)
-> mapPayload(data)
-> POST /api/vouchers
-> VouchersController.Create(request)
-> VoucherService.CreateAsync(request)
-> validate dữ liệu
-> tạo Voucher
-> lưu database
```

### 2. Luồng sửa voucher

```text
VoucherList.jsx
-> voucherService.update(id, form)
-> PUT /api/vouchers/{id}
-> VouchersController.Update(id, request)
-> VoucherService.UpdateAsync(id, request)
-> tìm voucher
-> cập nhật field
-> SaveChanges
```

### 3. Luồng xoá voucher

```text
VoucherList.jsx
-> voucherService.delete(id)
-> DELETE /api/vouchers/{id}
-> VouchersController.Delete(id)
-> VoucherService.DeleteAsync(id)
```

Trong controller, xoá voucher yêu cầu:

```csharp
[Authorize(Roles = RoleConstant.Admin)]
```

Tức là Staff có thể xem/tạo/sửa tuỳ endpoint, nhưng xoá cần quyền Admin.

### 4. Luồng validate voucher khi đặt hàng

```text
OrderService.CheckoutAsync hoặc CreatePosOrderAsync
-> nếu có VoucherCode
-> VoucherService.ValidateAsync(code, subtotal)
-> kiểm tra mã tồn tại
-> kiểm tra trạng thái Active
-> kiểm tra ngày bắt đầu/kết thúc
-> kiểm tra đơn tối thiểu
-> kiểm tra usage limit
-> tính số tiền giảm
-> trả VoucherValidationResult
```

Câu trả lời mẫu:

```text
Voucher không chỉ là CRUD. Khi tạo đơn, OrderService gọi VoucherService.ValidateAsync để kiểm tra mã còn hiệu lực, còn lượt dùng, đạt giá trị đơn tối thiểu và tính tiền giảm. Nhờ vậy tổng tiền của đơn được tính ở backend, tránh việc frontend tự quyết định số tiền giảm.
```

## VIII. Phân tích từng file Voucher

### 1. `VoucherList.jsx`

Chức năng:

- Hiển thị danh sách voucher.
- Lưu form tạo/sửa voucher.
- Validate input cơ bản ở frontend.
- Gọi service tạo/sửa/xoá.
- Hiển thị trạng thái, loại giảm giá, ngày bắt đầu/kết thúc.

Các khái niệm cần hiểu:

| Khái niệm | Ý nghĩa |
|---|---|
| `Percent` | Giảm theo phần trăm |
| `Amount` | Giảm số tiền cố định |
| `MinOrderValue` | Giá trị đơn tối thiểu để dùng mã |
| `MaxDiscount` | Mức giảm tối đa khi giảm theo phần trăm |
| `UsageLimit` | Tổng số lượt dùng |
| `PerUserLimit` | Giới hạn mỗi người dùng |
| `StartAt`, `EndAt` | Thời gian hiệu lực |

### 2. `voucherService.js`

File này có hai nhiệm vụ:

1. Gọi API voucher.
2. Chuyển đổi dữ liệu giữa frontend và backend.

Các hàm cần hiểu:

| Hàm | Vai trò |
|---|---|
| `normalizeVoucher` | Chuẩn hoá response để frontend đọc cùng một kiểu field |
| `normalizeCollection` | Chuẩn hoá danh sách voucher |
| `normalizeOne` | Chuẩn hoá một voucher |
| `mapPayload` | Map form frontend sang request backend |
| `statusToNumber` | Đổi status dạng chữ sang số |
| `numberToStatus` | Đổi status dạng số sang chữ |

Cần nói được:

```text
voucherService có normalize vì dữ liệu có thể có tên field khác nhau giữa backend hoặc các phiên bản cũ. Component chỉ dùng field đã chuẩn hoá như id, code, discountType, discountValue.
```

### 3. `VouchersController.cs`

Endpoint chính:

| Endpoint | Quyền | Vai trò |
|---|---|---|
| `GET /api/vouchers` | Admin/Staff | Xem danh sách |
| `GET /api/vouchers/available` | Anonymous | Lấy voucher đang khả dụng |
| `GET /api/vouchers/{id}` | Admin/Staff | Xem chi tiết |
| `POST /api/vouchers` | Admin/Staff | Tạo voucher |
| `PUT /api/vouchers/{id}` | Admin/Staff | Sửa voucher |
| `DELETE /api/vouchers/{id}` | Admin | Xoá voucher |
| `POST /api/vouchers/validate` | Đăng nhập | Kiểm tra voucher khi đặt hàng |

### 4. `VoucherService.cs`

Hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `SearchAsync` | Lấy danh sách voucher có phân trang |
| `GetAvailableAsync` | Lấy voucher còn hiệu lực |
| `GetAsync` | Lấy chi tiết |
| `CreateAsync` | Tạo voucher |
| `UpdateAsync` | Cập nhật voucher |
| `DeleteAsync` | Xoá hoặc vô hiệu hoá voucher |
| `ValidateAsync` | Kiểm tra voucher và tính tiền giảm |

## IX. Luồng Inventory cần thuộc

### 1. Tồn kho gồm những gì?

Trong `InventoryItem.cs`:

```csharp
public int SkuId { get; set; }
public int OnHand { get; set; }
public int Reserved { get; set; }
public int ReorderPoint { get; set; } = 5;
public int Available => OnHand - Reserved;
```

Giải thích:

| Field | Ý nghĩa |
|---|---|
| `SkuId` | Biến thể sản phẩm đang quản lý tồn |
| `OnHand` | Tồn thực tế trong kho |
| `Reserved` | Tồn đang giữ cho đơn |
| `Available` | Tồn còn bán được |
| `ReorderPoint` | Ngưỡng cảnh báo tồn thấp |

Câu trả lời mẫu:

```text
Tồn khả dụng không phải lúc nào cũng bằng tồn thực tế. Nếu kho có 10 sản phẩm nhưng 3 sản phẩm đang được giữ cho đơn chưa giao thì OnHand là 10, Reserved là 3, Available là 7.
```

### 2. Luồng xem tồn kho

```text
InventoryView.jsx
-> fetchInventory()
-> inventoryService.getAll(params)
-> GET /api/inventory
-> InventoryController.GetInventory(request)
-> InventoryService.GetInventoryAsync(request)
-> InventoryRepository truy vấn InventoryItem/Sku/Product
-> trả danh sách tồn kho và summary
```

### 3. Luồng điều chỉnh tồn

```text
InventoryView.jsx
-> handleAdjustStock()
-> inventoryService.adjustStock(payload)
-> POST /api/inventory/adjust
-> InventoryController.Adjust(request)
-> InventoryService.AdjustStockAsync(request, userId)
-> kiểm tra nghiệp vụ
-> cập nhật InventoryItem.OnHand
-> ghi StockMovement
-> SaveChanges
```

Các kiểu điều chỉnh:

| Loại | Ý nghĩa |
|---|---|
| `Import` | Nhập thêm vào kho |
| `Export` | Xuất/giảm khỏi kho |
| `SetActual` | Đặt lại tồn thực tế theo kiểm kê |

Điểm cần nhớ:

```text
Khi giảm tồn, backend phải kiểm tra không được làm OnHand nhỏ hơn Reserved.
Vì nếu đang giữ 5 sản phẩm cho đơn hàng mà chỉnh tồn thực tế xuống 3 thì dữ liệu bị mâu thuẫn.
```

### 4. Luồng cập nhật ngưỡng tồn thấp

```text
InventoryView.jsx
-> handleSaveThreshold()
-> inventoryService.updateThreshold({ skuId, reorderPoint })
-> PUT /api/inventory/threshold
-> InventoryController.UpdateThreshold(request)
-> InventoryService.UpdateThresholdAsync(request)
-> cập nhật InventoryItem.ReorderPoint
```

### 5. Luồng phiếu kho

```text
StockDocumentList.jsx
-> tạo form phiếu kho
-> inventoryService.createDocument(payload)
-> POST /api/inventory/documents
-> InventoryController.CreateDocument(request)
-> InventoryService.CreateDocumentAsync(request, userId)
-> tạo StockDocument và StockDocumentLine
-> trạng thái ban đầu Draft
```

Khi duyệt phiếu:

```text
StockDocumentList.jsx
-> inventoryService.approveDocument(id)
-> POST /api/inventory/documents/{id}/approve
-> InventoryController.Approve(id)
-> InventoryService.ApproveDocumentAsync(id, userId)
-> áp thay đổi tồn
-> ghi StockMovement
-> đổi trạng thái phiếu thành Approved
```

Khi huỷ phiếu:

```text
StockDocumentList.jsx
-> inventoryService.cancelDocument(id)
-> POST /api/inventory/documents/{id}/cancel
-> InventoryService.CancelDocumentAsync(id)
-> đổi trạng thái phiếu thành Cancelled
```

## X. Phân tích từng file Inventory

### 1. `InventoryView.jsx`

State quan trọng:

- `inventory`: danh sách tồn kho.
- `summary`: tổng quan tồn kho.
- `page`, `totalPages`: phân trang.
- `search`, `stockStatus`, `lowStockOnly`, `hasHold`: lọc dữ liệu.
- `showAdjustModal`: mở modal điều chỉnh tồn.
- `showThresholdModal`: mở modal cập nhật ngưỡng.
- `adjustForm`: form điều chỉnh tồn.

Hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `fetchInventory` | Tải danh sách tồn kho |
| `fetchAdjustments` | Tải lịch sử điều chỉnh |
| `handleSync` | Đồng bộ tồn theo ledger |
| `handleSaveThreshold` | Lưu ngưỡng tồn thấp |
| `handleAdjustStock` | Điều chỉnh tồn |
| `handleExport` | Xuất dữ liệu tồn kho ra Excel |

### 2. `StockDocumentList.jsx`

State quan trọng:

- `documents`: danh sách phiếu kho.
- `selectedDocument`: phiếu đang chọn.
- `details`: dòng chi tiết phiếu.
- `skus`: danh sách SKU để chọn trong phiếu.
- `form`: dữ liệu tạo phiếu.
- `showCreate`, `showDetail`: điều khiển modal.

Hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `fetchDocuments` | Tải danh sách phiếu kho |
| `fetchLookups` | Tải SKU để tạo phiếu |
| `updateLine` | Sửa từng dòng trong phiếu |
| `approveDocument` | Duyệt phiếu |
| `cancelDocument` | Huỷ phiếu |

Cần nói được:

```text
Phiếu kho thường có trạng thái Draft trước. Khi duyệt phiếu thì backend mới áp thay đổi vào tồn kho thật và ghi StockMovement.
```

### 3. `inventoryService.js`

Các hàm chính:

```js
getAll: (params) => api.get('/inventory', { params })
sync: () => api.post('/inventory/sync')
getHolds: (params) => api.get('/inventory/holds', { params })
getAdjustments: (params) => api.get('/inventory/adjustments', { params })
getDocuments: (params) => api.get('/inventory/documents', { params })
createDocument: (payload) => api.post('/inventory/documents', payload)
approveDocument: (id) => api.post(`/inventory/documents/${id}/approve`)
cancelDocument: (id, payload) => api.post(`/inventory/documents/${id}/cancel`, payload)
updateThreshold: (payload) => api.put('/inventory/threshold', payload)
adjustStock: (payload) => api.post('/inventory/adjust', payload)
exportCsv: (params) => api.get('/inventory/export', { params, responseType: 'blob' })
```

### 4. `InventoryController.cs`

Route chính:

```csharp
[Authorize(Roles = $"{RoleConstant.Admin},{RoleConstant.Staff}")]
[Route("api/inventory")]
```

Điểm quan trọng:

- Inventory là nghiệp vụ admin/staff, không cho khách thường truy cập.
- Một số hành động nhập kho yêu cầu Admin.
- Controller ghi audit khi tạo/duyệt/huỷ phiếu, điều chỉnh tồn, sync.

### 5. `InventoryService.cs`

Hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `GetInventoryAsync` | Lấy danh sách tồn kho |
| `GetMovementsAsync` | Lấy lịch sử biến động kho |
| `CreateDocumentAsync` | Tạo phiếu kho |
| `ApproveDocumentAsync` | Duyệt phiếu và áp vào tồn |
| `CancelDocumentAsync` | Huỷ phiếu |
| `AdjustStockAsync` | Điều chỉnh tồn trực tiếp |
| `UpdateThresholdAsync` | Cập nhật ngưỡng cảnh báo |
| `SyncAsync` | Đồng bộ tồn theo sổ cái |
| `ApplyAsync` | Hàm nội bộ áp biến động tồn |

`ApplyAsync` là hàm rất quan trọng vì nó cập nhật tồn và ghi lịch sử:

```text
Tìm hoặc tạo InventoryItem theo SkuId
Tính balanceAfter = OnHand + qtyDelta
Nếu giảm tồn mà balanceAfter < Reserved thì báo lỗi
Cập nhật OnHand
Ghi StockMovement
```

## XI. Quan hệ Orders - Voucher - Inventory

Đây là phần nên nói trong vấn đáp để thể hiện hiểu hệ thống:

```text
Orders, Voucher và Inventory không tách rời.
Khi tạo đơn, OrderService kiểm tra tồn kho và voucher.
Voucher ảnh hưởng DiscountTotal và GrandTotal.
Inventory đảm bảo số lượng bán không vượt quá tồn khả dụng.
Khi đơn được giao/xuất, tồn OnHand giảm và StockMovement được ghi.
Khi đơn bị huỷ, hệ thống giải phóng Reserved hoặc hoàn lại tồn tuỳ trạng thái.
```

Luồng POS hoàn chỉnh:

```text
PosOrder.jsx
-> orderService.createPos(payload)
-> OrdersController.CreatePos
-> OrderService.CreatePosOrderAsync
-> kiểm tra SKU/tồn
-> VoucherService.ValidateAsync nếu có mã
-> tạo Order/OrderLine
-> cập nhật InventoryItem
-> ghi Reservation hoặc StockMovement
-> trả id đơn
```

## XII. 6 nhóm câu hỏi ôn tập Ngày 3

### Nhóm 1 - Tổng quan nghiệp vụ

1. Ngày 3 tập trung vào những nghiệp vụ nào?
2. Vì sao đơn hàng, voucher và tồn kho có liên quan với nhau?
3. Luồng request từ admin xuống backend vẫn giống ngày 1 và ngày 2 ở điểm nào?
4. Nghiệp vụ nào nằm ở frontend, nghiệp vụ nào bắt buộc nằm ở backend?

Trả lời mẫu:

```text
Ngày 3 em học các nghiệp vụ admin gồm quản lý đơn hàng, POS, voucher và tồn kho. Ba phần này liên quan vì khi tạo đơn cần kiểm tra tồn kho, có thể áp voucher để tính giảm giá, sau đó khi giao hoặc huỷ đơn thì tồn kho phải thay đổi tương ứng. Frontend chủ yếu hiển thị form, bảng, modal và gọi service. Backend mới là nơi kiểm tra nghiệp vụ thật như tồn khả dụng, validate voucher, cập nhật trạng thái, trừ kho và lưu lịch sử.
```

### Nhóm 2 - Orders

1. Admin xem danh sách đơn hàng đi qua những file nào?
2. Chi tiết đơn hàng lấy `id` từ đâu?
3. Cập nhật trạng thái đơn gọi API nào?
4. Huỷ đơn khác cập nhật trạng thái thường ở điểm nào?
5. POS tạo đơn như thế nào?
6. Vì sao trạng thái đơn và trạng thái thanh toán phải tách nhau?

Trả lời mẫu:

```text
Admin xem danh sách đơn ở OrderList.jsx. Component gọi orderService.getAll, service gọi GET /api/orders. Backend nhận ở OrdersController.Search rồi gọi OrderService.SearchOrdersAsync để lấy dữ liệu và trả PagingResponse. Khi xem chi tiết, OrderDetail.jsx lấy id từ URL rồi gọi orderService.getById(id). Nếu cập nhật trạng thái thì gọi PUT /api/orders/{id}/status, còn huỷ đơn gọi POST /api/orders/{id}/cancel vì huỷ đơn phải xử lý thêm tồn giữ chỗ, hoàn tồn nếu cần và ghi lịch sử.
```

### Nhóm 3 - POS

1. POS khác đơn online ở đâu?
2. POS gửi những dữ liệu nào lên backend?
3. Backend kiểm tra tồn ở đâu?
4. Nếu bán đứt thì tồn kho thay đổi như thế nào?
5. Nếu đặt cọc/chưa giao ngay thì tồn kho thay đổi như thế nào?

Trả lời mẫu:

```text
POS là đơn do admin hoặc staff tạo tại quầy, dùng PosOrder.jsx. Frontend gửi danh sách SKU, số lượng, giá, khách hàng, voucher, phương thức thanh toán và số tiền đã trả. Backend xử lý ở OrderService.CreatePosOrderAsync. Service kiểm tra tồn khả dụng trước khi tạo đơn. Nếu bán và giao ngay thì OnHand giảm và ghi StockMovement. Nếu đơn cần giữ hàng trước thì Reserved tăng và tạo Reservation, OnHand chưa giảm ngay.
```

### Nhóm 4 - Voucher

1. Voucher CRUD đi qua file nào?
2. `voucherService.js` có nhiệm vụ gì?
3. `mapPayload` để làm gì?
4. Validate voucher kiểm tra những điều kiện nào?
5. Vì sao không nên để frontend tự tính tiền giảm?

Trả lời mẫu:

```text
Voucher ở frontend nằm trong VoucherList.jsx và voucherService.js. Component xử lý bảng, form và modal; service gọi API, normalize response và map payload trước khi gửi backend. Backend nhận ở VouchersController và xử lý ở VoucherService. Khi validate voucher, backend kiểm tra mã có tồn tại không, còn active không, còn trong thời gian hiệu lực không, đơn có đạt giá trị tối thiểu không, còn lượt dùng không và tính số tiền giảm. Không để frontend tự quyết định tiền giảm vì người dùng có thể sửa request, backend mới là nơi tin cậy.
```

### Nhóm 5 - Inventory

1. `OnHand`, `Reserved`, `Available` là gì?
2. Khi xem tồn kho, frontend gọi API nào?
3. Điều chỉnh tồn đi qua hàm nào?
4. Phiếu kho khác điều chỉnh tồn trực tiếp ở đâu?
5. Vì sao khi giảm tồn phải kiểm tra `Reserved`?

Trả lời mẫu:

```text
OnHand là tồn thực tế trong kho, Reserved là số lượng đang giữ cho đơn hàng, Available là số lượng còn bán được và bằng OnHand trừ Reserved. Trang InventoryView gọi inventoryService.getAll để lấy GET /api/inventory. Khi điều chỉnh tồn, frontend gọi POST /api/inventory/adjust, backend xử lý ở InventoryService.AdjustStockAsync. Phiếu kho có quy trình tạo Draft rồi duyệt, khi duyệt mới áp vào tồn. Khi giảm tồn phải kiểm tra Reserved để không làm tồn thực tế nhỏ hơn số lượng đang giữ cho các đơn chưa hoàn tất.
```

### Nhóm 6 - Code lại hoặc thêm chức năng nhỏ

1. Nếu xoá hàm `fetchInventory`, viết lại thế nào?
2. Nếu thêm filter trạng thái đơn, sửa ở đâu?
3. Nếu thêm trường `note` cho voucher, sửa những file nào?
4. Nếu thêm nút "Đánh dấu đã giao" ở OrderDetail, cần gọi API nào?
5. Nếu thêm cảnh báo tồn thấp, dùng field nào?

Trả lời mẫu:

```text
Nếu thêm chức năng nhỏ, em sẽ lần theo luồng FE -> service -> Controller -> Service -> Repository/DbContext. Ví dụ thêm filter trạng thái đơn thì frontend thêm state và input ở OrderList.jsx, truyền param vào orderService.getAll. Backend cần OrderSearchRequest nhận status, OrderService hoặc Repository dùng status đó để lọc query. Nếu thêm field vào database như note của voucher thì sửa Entity/DTO/Service/mapPayload và tạo migration mới.
```

## XIII. Cách học trong ngày

### Buổi 1 - Orders

Việc cần làm:

- Đọc `orderService.js`.
- Đọc `OrderList.jsx`.
- Đọc `OrderDetail.jsx`.
- Đọc `OrdersController.cs`.
- Đọc các hàm chính trong `OrderService.cs`.

Tự nói lại được:

```text
Danh sách đơn đi như thế nào?
Chi tiết đơn đi như thế nào?
Cập nhật trạng thái đi như thế nào?
Huỷ đơn ảnh hưởng tồn kho ra sao?
```

### Buổi 2 - POS và trạng thái

Việc cần làm:

- Đọc `PosOrder.jsx`.
- Đọc `CreatePos` trong `OrdersController.cs`.
- Đọc `CreatePosOrderAsync` trong `OrderService.cs`.
- Đọc `OrderEnums.cs`.

Tự nói lại được:

```text
POS tạo đơn ra sao?
OrderStatus, PaymentStatus, FulfillmentStatus khác nhau thế nào?
```

### Buổi 3 - Voucher

Việc cần làm:

- Đọc `VoucherList.jsx`.
- Đọc `voucherService.js`.
- Đọc `VouchersController.cs`.
- Đọc `VoucherService.cs`.
- Đọc `Voucher.cs`.

Tự nói lại được:

```text
Voucher CRUD ra sao?
Validate voucher kiểm tra gì?
Voucher ảnh hưởng đơn hàng ở đâu?
```

### Buổi 4 - Inventory

Việc cần làm:

- Đọc `InventoryView.jsx`.
- Đọc `StockDocumentList.jsx`.
- Đọc `inventoryService.js`.
- Đọc `InventoryController.cs`.
- Đọc `InventoryService.cs`.
- Đọc `InventoryItem.cs`, `Reservation.cs`, `StockMovement.cs`.

Tự nói lại được:

```text
OnHand, Reserved, Available là gì?
Phiếu kho tạo và duyệt như thế nào?
Khi đơn giao/huỷ thì tồn thay đổi ra sao?
```

## XIV. Checklist cuối ngày

Tự kiểm tra:

- [ ] Nói được luồng xem danh sách đơn.
- [ ] Nói được luồng xem chi tiết đơn.
- [ ] Nói được luồng cập nhật trạng thái đơn.
- [ ] Nói được luồng huỷ đơn và ảnh hưởng tới tồn kho.
- [ ] Nói được luồng tạo đơn POS.
- [ ] Phân biệt được `OrderStatus`, `PaymentStatus`, `FulfillmentStatus`.
- [ ] Nói được voucher CRUD đi qua những file nào.
- [ ] Nói được validate voucher kiểm tra những điều kiện nào.
- [ ] Giải thích được `OnHand`, `Reserved`, `Available`.
- [ ] Nói được phiếu kho Draft -> Approved -> áp vào tồn kho.
- [ ] Nói được vì sao backend mới là nơi quyết định nghiệp vụ thật.

## XV. Câu trả lời ngắn để học thuộc

Nếu giảng viên hỏi "Ngày 3 em nắm phần nghiệp vụ admin như thế nào?", có thể trả lời:

```text
Em nắm ba nghiệp vụ chính là đơn hàng, voucher và tồn kho. Ở frontend admin, em nắm các page OrderList, OrderDetail, PosOrder, VoucherList, InventoryView và StockDocumentList. Các page này quản lý state, form, bảng, modal rồi gọi service JS. Service dùng api.js để gửi request kèm JWT xuống backend.

Ở backend, request đi vào OrdersController, VouchersController hoặc InventoryController. Controller kiểm tra quyền và gọi Service. Service là nơi xử lý nghiệp vụ thật: tạo đơn, kiểm tra tồn khả dụng, validate voucher, cập nhật trạng thái, trừ kho, giữ chỗ, huỷ đơn và ghi lịch sử. Dữ liệu cuối cùng được lưu qua Repository/AppDbContext xuống SQL Server.
```

