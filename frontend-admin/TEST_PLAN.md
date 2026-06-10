# Kế hoạch Test nghiệp vụ Admin UI

## Điều kiện tiên quyết

- Backend 5 services đang chạy (ports 5000-5004)
- Database ShowroomDB có data từ script2.sql
- FrontendAdmin dev server chạy tại http://localhost:5175
- Có tài khoản Admin trong DB (role = Admin)

## Tài khoản test

| Email | Mật khẩu | Role |
|-------|-----------|------|
| admin123@gmail.com | dung123 | Admin |

---

## Module 1: Đăng nhập & Phân quyền

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 1.1 | Login thành công | Nhập email + password đúng → Đăng nhập | Redirect về Dashboard, sidebar hiển thị đầy đủ menu |
| 1.2 | Login thất bại | Nhập sai password | Hiển thị thông báo lỗi, không redirect |
| 1.3 | Login email không tồn tại | Nhập email không có trong DB | Hiển thị thông báo lỗi |
| 1.4 | Auth guard | Truy cập /products khi chưa login | Redirect về /login |
| 1.5 | Logout | Click "Đăng xuất" ở navbar | Redirect về /login, xóa token |
| 1.6 | Token hết hạn | Chờ token expire hoặc xóa thủ công | Tự redirect về /login khi gọi API |

---

## Module 2: Dashboard & Tổng quan

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 2.1 | Hiển thị stat cards | Mở Dashboard | 4 cards: Sản phẩm, Đơn hàng, Người dùng, Doanh thu tháng — có số liệu |
| 2.2 | Biểu đồ doanh thu | Xem chart "Doanh thu 7 ngày" | Line chart hiển thị, tooltip format VND |
| 2.3 | Biểu đồ trạng thái đơn | Xem chart "Đơn hàng theo trạng thái" | Doughnut chart với legend |
| 2.4 | Đơn hàng mới nhất | Xem bảng "Đơn hàng mới nhất" | Hiển thị tối đa 5 đơn, click mã đơn → chi tiết |
| 2.5 | Top sản phẩm bán chạy | Xem bảng "Top sản phẩm" | Hiển thị tên + số lượng bán + doanh thu |
| 2.6 | Dashboard khi DB rỗng | Xóa hết data → mở Dashboard | Hiển thị 0 / empty state, không crash |

---

## Module 3: Quản lý Sản phẩm (CRUD)

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 3.1 | Xem danh sách | Mở /products | Table hiển thị sản phẩm, có pagination |
| 3.2 | Tìm kiếm | Nhập "Air Blade" → Tìm | Chỉ hiển thị SP có tên chứa "Air Blade" |
| 3.3 | Lọc theo danh mục | Chọn danh mục "Xe tay ga" | Chỉ hiển thị SP thuộc danh mục đó |
| 3.4 | Lọc theo hãng xe | Chọn hãng "Honda" | Chỉ hiển thị SP hãng Honda |
| 3.5 | Lọc theo trạng thái | Chọn "Đang bán" | Chỉ hiển thị SP active |
| 3.6 | Thêm sản phẩm | Click "Thêm" → Điền form → Lưu | SP mới xuất hiện trong danh sách |
| 3.7 | Thêm SP - validation | Bỏ trống tên, giá = 0 → Lưu | Hiển thị lỗi validation, không submit |
| 3.8 | Sửa sản phẩm | Click edit → Đổi tên/giá → Cập nhật | Thông tin cập nhật trong table |
| 3.9 | Xóa sản phẩm | Click xóa → Confirm | SP biến mất khỏi danh sách |
| 3.10 | Xóa SP - hủy confirm | Click xóa → Cancel | SP vẫn còn |
| 3.11 | Slug tự động | Nhập tên "Honda Wave Alpha 110" | Slug tự sinh: "honda-wave-alpha-110" |
| 3.12 | Pagination | Có >10 SP → Click trang 2 | Hiển thị SP trang 2 |

---

## Module 4: Quản lý Biến thể sản phẩm

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 4.1 | Xem biến thể | Click icon biến thể trên SP | Modal hiển thị danh sách biến thể |
| 4.2 | Thêm biến thể | Click "Thêm biến thể" → Điền → Lưu | Biến thể mới trong table |
| 4.3 | Sửa biến thể | Click edit → Đổi màu/giá → Lưu | Cập nhật thành công |
| 4.4 | Xóa biến thể | Click xóa → Confirm | Biến thể bị xóa |

---

## Module 5: Quản lý Ảnh sản phẩm

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 5.1 | Xem ảnh | Click icon ảnh trên SP | Modal hiển thị grid ảnh |
| 5.2 | Thêm ảnh (URL) | Nhập URL ảnh → Thêm | Ảnh mới xuất hiện trong grid |
| 5.3 | Đặt ảnh chính | Click icon star trên ảnh | Badge "Ảnh chính" chuyển sang ảnh đó |
| 5.4 | Xóa ảnh | Click xóa → Confirm | Ảnh biến mất |
| 5.5 | URL ảnh lỗi | Nhập URL không hợp lệ | Hiển thị placeholder "No Image" |

---

## Module 6: Quản lý Danh mục

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 6.1 | Xem danh sách | Mở /categories | Table hiển thị danh mục |
| 6.2 | Thêm danh mục gốc | Thêm DM không chọn cha | DM mới ở cấp gốc |
| 6.3 | Thêm danh mục con | Thêm DM chọn cha = "Xe máy" | DM mới hiển thị cha = "Xe máy" |
| 6.4 | Sửa danh mục | Đổi tên + thứ tự | Cập nhật thành công |
| 6.5 | Xóa danh mục | Xóa DM không có SP | Xóa thành công |
| 6.6 | Slug tự động | Nhập "Phụ tùng xe máy" | Slug: "phu-tung-xe-may" |

---

## Module 7: Hãng xe & Dòng xe

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 7.1 | Tab Hãng xe | Mở /brands → Tab "Hãng xe" | Hiển thị Honda, Yamaha, VinFast... |
| 7.2 | Thêm hãng xe | Thêm hãng "Suzuki" | Hãng mới trong table |
| 7.3 | Sửa hãng xe | Đổi logo URL | Logo preview cập nhật |
| 7.4 | Xóa hãng xe | Xóa hãng không có dòng xe | Xóa thành công |
| 7.5 | Tab Dòng xe | Chuyển tab "Dòng xe" | Hiển thị danh sách dòng xe |
| 7.6 | Lọc dòng xe theo hãng | Chọn hãng "Honda" | Chỉ hiển thị dòng xe Honda |
| 7.7 | Thêm dòng xe | Chọn hãng + nhập tên | Dòng xe mới trong table |
| 7.8 | Xóa dòng xe | Xóa dòng xe | Xóa thành công |

---

## Module 8: Quản lý Showroom

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 8.1 | Xem danh sách | Mở /showrooms | Table hiển thị 4 showroom |
| 8.2 | Thêm showroom | Điền đầy đủ thông tin → Lưu | Showroom mới trong table |
| 8.3 | Sửa showroom | Đổi địa chỉ + SĐT | Cập nhật thành công |
| 8.4 | Xóa showroom | Xóa showroom | Xóa thành công |

---

## Module 9: Quản lý Đơn hàng

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 9.1 | Xem danh sách | Mở /orders | Table hiển thị đơn hàng, badge trạng thái |
| 9.2 | Tìm theo mã đơn | Nhập mã đơn → Tìm | Chỉ hiển thị đơn khớp |
| 9.3 | Lọc theo trạng thái | Chọn "Chờ xử lý" | Chỉ hiển thị đơn Pending |
| 9.4 | Xem chi tiết | Click "Chi tiết" | Trang detail: info khách, items, thanh toán |
| 9.5 | Cập nhật trạng thái | Click "Cập nhật" → Chọn "Đã xác nhận" | Trạng thái đổi thành Confirmed |
| 9.6 | Hủy đơn | Click "Hủy đơn" → Nhập lý do → Xác nhận | Trạng thái = Cancelled |
| 9.7 | Hủy đơn - không nhập lý do | Click hủy → Bỏ trống lý do → Submit | Alert yêu cầu nhập lý do |

---

## Module 10: Quản lý Thanh toán

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 10.1 | Xem danh sách | Mở /payments | Table hiển thị thanh toán |
| 10.2 | Lọc theo trạng thái | Chọn "Chờ thanh toán" | Chỉ hiển thị Pending |
| 10.3 | Lọc theo phương thức | Chọn "Chuyển khoản" | Chỉ hiển thị BankTransfer |
| 10.4 | Xác nhận thanh toán | Click "Xác nhận" trên TT Pending | Trạng thái → Paid |
| 10.5 | Hủy thanh toán | Click "Hủy" → Nhập lý do | Trạng thái → Cancelled |

---

## Module 11: Quản lý Voucher (CRUD)

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 11.1 | Xem danh sách | Mở /vouchers | Table hiển thị voucher |
| 11.2 | Thêm voucher % | Thêm: code=TEST10, loại=Percent, giá trị=10 | Voucher mới hiển thị "10%" |
| 11.3 | Thêm voucher cố định | Thêm: loại=Fixed, giá trị=50000 | Hiển thị "50.000 ₫" |
| 11.4 | Sửa voucher | Đổi thời hạn + giới hạn | Cập nhật thành công |
| 11.5 | Xóa voucher | Xóa voucher test | Xóa thành công |
| 11.6 | Validation | Bỏ trống mã code → Lưu | Alert yêu cầu nhập mã |

---

## Module 12: Quản lý Tồn kho

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 12.1 | Xem tồn kho | Mở /inventory | Table: SP, biến thể, thực tế, giữ chỗ, khả dụng |
| 12.2 | Đồng bộ tồn kho | Click "Đồng bộ tồn kho" → Confirm | Thông báo thành công, data refresh |
| 12.3 | Hiển thị cảnh báo | SP có tồn kho khả dụng ≤ 0 | Số hiển thị màu đỏ |

---

## Module 13: Quản lý Người dùng

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 13.1 | Xem danh sách | Mở /users | Table hiển thị users, badge role + status |
| 13.2 | Tìm kiếm | Nhập tên/email | Kết quả lọc đúng |
| 13.3 | Thêm user | Điền form → Lưu | User mới trong table |
| 13.4 | Thêm user - thiếu mật khẩu | Bỏ trống password → Lưu | Alert yêu cầu nhập MK |
| 13.5 | Sửa user | Đổi tên + role | Cập nhật thành công |
| 13.6 | Sửa user - không đổi MK | Để trống MK → Cập nhật | MK cũ giữ nguyên |
| 13.7 | Xóa user | Xóa user test | Xóa thành công |

---

## Module 14: Quản lý Đánh giá

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 14.1 | Xem danh sách | Mở /reviews | Table hiển thị đánh giá, sao vàng |
| 14.2 | Lọc theo trạng thái | Chọn "Chờ duyệt" | Chỉ hiển thị Pending |
| 14.3 | Lọc theo điểm | Chọn "5 sao" | Chỉ hiển thị 5★ |
| 14.4 | Duyệt đánh giá | Click ✓ (duyệt) | Trạng thái → Approved |
| 14.5 | Ẩn đánh giá | Click 👁 (ẩn) | Trạng thái → Hidden |
| 14.6 | Xóa đánh giá | Click xóa → Confirm | Đánh giá bị xóa |

---

## Module 15: Quản lý Bài viết (CRUD)

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 15.1 | Xem danh sách | Mở /posts | Table hiển thị bài viết |
| 15.2 | Thêm bài viết | Điền tiêu đề + nội dung → Lưu | Bài viết mới, trạng thái Draft |
| 15.3 | Xuất bản bài viết | Sửa → Đổi trạng thái = Published | Badge "Đã xuất bản" |
| 15.4 | Slug tự động | Nhập "Hướng dẫn bảo dưỡng xe" | Slug: "huong-dan-bao-duong-xe" |
| 15.5 | Xóa bài viết | Xóa bài test | Xóa thành công |

---

## Module 16: Quản lý FAQ (CRUD)

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 16.1 | Xem danh sách | Mở /faq | Table hiển thị FAQ |
| 16.2 | Thêm FAQ | Nhập câu hỏi + trả lời → Lưu | FAQ mới trong table |
| 16.3 | Sửa FAQ | Đổi thứ tự hiển thị | Cập nhật thành công |
| 16.4 | Xóa FAQ | Xóa FAQ test | Xóa thành công |
| 16.5 | Validation | Bỏ trống câu trả lời → Lưu | Alert yêu cầu nhập |

---

## Module 17: Quản lý Liên hệ

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 17.1 | Xem danh sách | Mở /contacts | Table hiển thị yêu cầu liên hệ |
| 17.2 | Lọc theo trạng thái | Chọn "Chờ xử lý" | Chỉ hiển thị Pending |
| 17.3 | Xem chi tiết | Click icon mắt | Modal hiển thị đầy đủ nội dung |
| 17.4 | Đánh dấu đã xử lý | Click "Đánh dấu đã xử lý" | Trạng thái → Processed |
| 17.5 | Đã xử lý - không hiện nút | Xem liên hệ đã xử lý | Không có nút "Đánh dấu" |

---

## Module 18: Báo cáo & Thống kê

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 18.1 | Mặc định 30 ngày | Mở /reports | Hiển thị data 30 ngày gần nhất |
| 18.2 | Đổi khoảng thời gian | Chọn ngày bắt đầu/kết thúc → Áp dụng | Charts + data cập nhật theo range mới |
| 18.3 | Info boxes | Xem 3 info-box | Tổng doanh thu, Tổng đơn, Giá trị TB |
| 18.4 | Biểu đồ doanh thu | Xem line chart | Hiển thị doanh thu theo ngày, tooltip VND |
| 18.5 | Biểu đồ trạng thái | Xem doughnut chart | Hiển thị phân bổ trạng thái đơn |
| 18.6 | Top sản phẩm (chart) | Xem bar chart | Horizontal bar hiển thị top SP |
| 18.7 | Top sản phẩm (table) | Xem bảng chi tiết | Tên SP + số lượng bán + doanh thu |
| 18.8 | Không có data | Chọn range không có đơn | Empty state "Không có dữ liệu" |

---

## Module 19: UI/UX chung

| # | Test case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 19.1 | Sidebar navigation | Click từng menu item | Navigate đúng route, highlight active |
| 19.2 | Sidebar collapse | Click icon hamburger | Sidebar thu gọn, content mở rộng |
| 19.3 | Loading state | Mở trang khi API chậm | Spinner hiển thị |
| 19.4 | Empty state | Trang không có data | Icon + text "Chưa có..." |
| 19.5 | Error state | Backend tắt → mở trang | Alert lỗi hiển thị |
| 19.6 | Modal đóng/mở | Mở modal → Click X hoặc Hủy | Modal đóng, form reset |
| 19.7 | Format tiền VND | Xem giá sản phẩm | Hiển thị "55.990.000 ₫" |
| 19.8 | Format ngày | Xem ngày tạo | Hiển thị "20/05/2026 13:01" |
| 19.9 | Responsive tablet | Thu nhỏ browser ~768px | Sidebar collapse, table responsive |

---

## Thứ tự test đề xuất

1. **Module 1** (Login) — phải pass trước khi test các module khác
2. **Module 2** (Dashboard) — verify data flow tổng quan
3. **Module 3-5** (Sản phẩm + Biến thể + Ảnh) — module phức tạp nhất
4. **Module 6-8** (Danh mục + Hãng xe + Showroom) — CRUD đơn giản
5. **Module 9-12** (Đơn hàng + Thanh toán + Voucher + Tồn kho) — nghiệp vụ order
6. **Module 13-17** (User + Content) — CRUD + workflow
7. **Module 18** (Báo cáo) — cần data từ các module trên
8. **Module 19** (UI/UX) — test xuyên suốt

---

## Ghi chú quan trọng

- **Backend API chưa đầy đủ**: Một số endpoint admin (CRUD brands, update order status, inventory sync...) có thể chưa được implement ở backend. Khi gặp lỗi 404/405, ghi nhận là "cần bổ sung backend endpoint".
- **Data test**: Sử dụng data có sẵn từ script2.sql (15 SP, 3 đơn hàng, 15 users, 44 vouchers...).
- **Không test trên production**: Chỉ test trên localhost.
- **Screenshot**: Chụp ảnh khi phát hiện bug để dễ reproduce.
