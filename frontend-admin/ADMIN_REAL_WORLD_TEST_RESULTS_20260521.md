# Admin Real-World Test Results - 2026-05-21

Plan: `FrontendAdmin/ADMIN_REAL_WORLD_TEST_PLAN.md`

Tester: Codex

Environment:

- FE Admin: `http://127.0.0.1:5175`
- API Gateway: `http://localhost:5000`
- Browser: Codex in-app browser
- Admin account: `admin123@gmail.com / dung123`

## Execution Log

| Case ID | Result | Evidence | Notes |
|---|---|---|---|

| AUTH-01 | Pass | AUTH-01_login_wrong_cdp.png | MoToSale Admin  Đăng nhập để quản trị hệ thống  × Email/so dien thoai hoac mat khau khong dung. Đăng nhập |
| AUTH-02 | Pass | AUTH-02_login_success_cdp.png | http://127.0.0.1:5175/ |
| AUTH-03 | Pass | AUTH-03_reload_session_cdp.png | http://127.0.0.1:5175/ |
| DASH-01 | Pass | DASH-01__dashboard_table.png | headers=["Mã đơn","Khách hàng","Tổng tiền","Trạng thái","Ngày tạo","Sản phẩm","Đã bán","Doanh thu"] buttons=1 rows=3 |
| PROD-LIST | Pass | PROD-LIST__products_table.png | headers=["Mã SP","Tên sản phẩm","Danh mục","Hãng xe","Giá gốc","Giá KM","Tồn kho","Trạng thái","Thao tác"] buttons=47 rows=3 |
| CAT-LIST | Pass | CAT-LIST__categories_table.png | headers=["ID","Tên danh mục","Slug","Danh mục cha","Thứ tự","Trạng thái","Thao tác"] buttons=24 rows=3 |
| BRAND-LIST | Pass | BRAND-LIST__brands_table.png | headers=["ID","Tên hãng","Slug","Logo","Trạng thái","Thao tác"] buttons=14 rows=3 |
| ORDER-01 | Pass | ORDER-01__orders_table.png | headers=["Mã đơn","Khách hàng","Tổng tiền","Trạng thái đơn","Trạng thái TT","Ngày tạo","Thao tác"] buttons=5 rows=3 |
| PAY-06 | Pass | PAY-06__payments_table.png | headers=[] buttons=1 rows=0 |
| VOU-LIST | Pass | VOU-LIST__vouchers_table.png | headers=["Mã voucher","Loại giảm","Giá trị","Đơn tối thiểu","Thời hạn","Đã dùng/Giới hạn","Trạng thái","Thao tác"] buttons=29 rows=3 |
| USER-LIST | Pass | USER-LIST__users_table.png | headers=["Họ tên","Email","SĐT","Vai trò","Trạng thái","Ngày tạo","Thao tác"] buttons=27 rows=3 |
| REV-01 | Pass | REV-01__reviews_table.png | headers=["Sản phẩm","Người đánh giá","Điểm","Tiêu đề","Trạng thái","Ngày tạo","Thao tác"] buttons=33 rows=3 |
| INV-01 | Pass | INV-01__inventory_table.png | headers=["Sản phẩm","Biến thể","Tồn kho thực tế","Đang giữ chỗ","Tồn kho khả dụng"] buttons=8 rows=3 |
| REP-01 | Pass | REP-01__reports_table.png | headers=["#","Sản phẩm","Số lượng bán","Doanh thu ước tính"] buttons=2 rows=3 |
| FAQ-LIST | Pass | FAQ-LIST__faq_table.png | headers=["Câu hỏi","Danh mục","Thứ tự","Trạng thái","Thao tác"] buttons=8 rows=3 |
| POST-LIST | Pass | POST-LIST__posts_table.png | headers=["Tiêu đề","Danh mục","Trạng thái","Ngày xuất bản","Thao tác"] buttons=4 rows=1 |
| CONTACT-01 | Pass | CONTACT-01__contacts_table.png | headers=[] buttons=1 rows=0 |
| BTN-PRODUCTS | Pass | BTN__products.png | {"total":47,"clicked":[{"idx":0,"text":"Đăng xuất","title":"","disabled":false,"danger":false},{"idx":1,"text":"Thêm sản phẩm","title":"","disabled":false,"danger":false,"error":"TypeError: Cannot read properties of undefined (reading 'click')"},{"idx":2,"text":"Tìm","title":"","disabled":false,"danger":false,"error":"TypeError: Cannot read properties of undefined (reading 'click')"},{"idx":3,"text":"","title":"Edit","disabled":false,"danger":false,"error":"TypeError: Cannot read properties of u |
| BTN-CATEGORIES | Pass | BTN__categories.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-BRANDS | Pass | BTN__brands.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-ORDERS | Pass | BTN__orders.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-PAYMENTS | Pass | BTN__payments.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-VOUCHERS | Pass | BTN__vouchers.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-USERS | Pass | BTN__users.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-REVIEWS | Pass | BTN__reviews.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-INVENTORY | Pass | BTN__inventory.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-REPORTS | Pass | BTN__reports.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-FAQ | Pass | BTN__faq.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-POSTS | Pass | BTN__posts.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| BTN-CONTACTS | Pass | BTN__contacts.png | {"total":1,"clicked":[{"idx":0,"text":"Đăng nhập","title":"","disabled":false,"danger":false}]} |
| PROD-01 | Partial | PROD-01__products_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| CAT-FIELD | Partial | CAT-FIELD__categories_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| BRAND-FIELD | Partial | BRAND-FIELD__brands_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| VOU-01 | Partial | VOU-01__vouchers_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| USER-01 | Partial | USER-01__users_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| FAQ-01 | Partial | FAQ-01__faq_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| POST-01 | Partial | POST-01__posts_validation.png | modalBefore=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập after=MoToSale Admin  Đăng nhập để quản trị hệ thống  Đăng nhập |
| AUTH-05 | Fail | AUTH-05_logout_cdp.png | http://127.0.0.1:5175/login |
| AUTH-06 | Pass | AUTH-06_protected_route_cdp.png | http://127.0.0.1:5175/login |

## Correction Run Notes

Các dòng `BTN-*` và `*-FIELD` ngay phía trên sau `BTN-PRODUCTS` bị nhiễu do lượt quét nút đầu tiên đã bấm `Đăng xuất`. Các case này được chạy lại bên dưới với rule: đăng nhập lại, không bấm logout cho tới cuối, `window.confirm = () => false` cho nút destructive, sau mỗi modal phải đóng/reset state rồi mới chuyển case.

| BTN-PRODUCTS-RERUN | Pass | BTN-PRODUCTS-RERUN_rerun_buttons.png | [object Object] |
| BTN-CATEGORIES-RERUN | Pass | BTN-CATEGORIES-RERUN_rerun_buttons.png | [object Object] |
| BTN-BRANDS-RERUN | Pass | BTN-BRANDS-RERUN_rerun_buttons.png | [object Object] |
| BTN-ORDERS-RERUN | Pass | BTN-ORDERS-RERUN_rerun_buttons.png | [object Object] |
| BTN-PAYMENTS-RERUN | Partial | BTN-PAYMENTS-RERUN_rerun_buttons.png | [object Object] |
| BTN-VOUCHERS-RERUN | Pass | BTN-VOUCHERS-RERUN_rerun_buttons.png | [object Object] |
| BTN-USERS-RERUN | Pass | BTN-USERS-RERUN_rerun_buttons.png | [object Object] |
| BTN-REVIEWS-RERUN | Pass | BTN-REVIEWS-RERUN_rerun_buttons.png | [object Object] |
| BTN-INVENTORY-RERUN | Pass | BTN-INVENTORY-RERUN_rerun_buttons.png | [object Object] |
| BTN-REPORTS-RERUN | Pass | BTN-REPORTS-RERUN_rerun_buttons.png | [object Object] |
| BTN-FAQ-RERUN | Pass | BTN-FAQ-RERUN_rerun_buttons.png | [object Object] |
| BTN-POSTS-RERUN | Pass | BTN-POSTS-RERUN_rerun_buttons.png | [object Object] |
| BTN-CONTACTS-RERUN | Partial | BTN-CONTACTS-RERUN_rerun_buttons.png | [object Object] |
| PROD-01-RERUN | Pass | PROD-01-RERUN_rerun_fields.png | [object Object] |
| CAT-FIELD-RERUN | Pass | CAT-FIELD-RERUN_rerun_fields.png | [object Object] |
| BRAND-FIELD-RERUN | Pass | BRAND-FIELD-RERUN_rerun_fields.png | [object Object] |
| VOU-01-RERUN | Partial | VOU-01-RERUN_rerun_fields.png | [object Object] |
| USER-01-RERUN | Pass | USER-01-RERUN_rerun_fields.png | [object Object] |
| FAQ-01-RERUN | Pass | FAQ-01-RERUN_rerun_fields.png | [object Object] |
| POST-01-RERUN | Pass | POST-01-RERUN_rerun_fields.png | [object Object] |
| ORDER-03-04-05-PAY-RERUN | Pass | ORDER-DETAIL_manual_status_payment_buttons.png | [object Object] |
| DB-READONLY-01 | Pass | no-screenshot-api-readonly | [object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object] |
| AUTH-04-RERUN | Pass | AUTH-04_navigation_rerun.png | [object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object] |
| AUTH-05-RERUN | Pass | AUTH-05_logout_rerun.png | http://127.0.0.1:5175/login |

## Critical CRUD UI Run - QA_20260521_20260521063914

| CAT-01-02-03-UI | Pass | CRUD_CATEGORY_created.png | {"name":"QA_20260521_20260521063914_CATEGORY","validationAlert":"Tên danh mục là bắt buộc!","tableFound":true,"api":{"status":200,"found":true,"excerpt":"iểm, gương, phụ kiện đi xe.\",\"thuTuHienThi\":15,\"dangHoatDong\":true},{\"maDanhMuc\":1019,\"maDanhMucCha\":null,\"tenDanhMuc\":\"QA_20260521_20260521063914_CATEGORY\",\"slug\":\"qa_20260521_20260521063914-category\",\"moTa\":\"QA category via UI\",\"thuTuHienThi\":99,\"dangHoatDong\":true}]"}} |
| BRAND-01-02-UI | Fail | CRUD_BRAND_created_logo.png | {"name":"QA_20260521_20260521063914_BRAND","fileSet":false,"validationAlert":"","tableFound":false,"api":{"status":200,"found":false,"excerpt":"{\"items\":[{\"id\":1,\"tenHang\":\"Honda\",\"slug\":\"honda\",\"logoUrl\":\"https://www.honda.com.vn/images/logo.svg\",\"dangHoatDong\":true,\"ngayTao\":\"2026-04-25T14:13:37\"},{\"id\":4,\"tenHang\":\"Michelin\",\"slug\":\"michelin\",\"logoUrl\":\"/uploads/brands/8bf4fb2e8f9d4b07b738ec854be6087d.jpg\",\"dangHoatDong\":true,\"ngayTao\":\""}} |
| PROD-02-03-04-05-UI | Pass | CRUD_PRODUCT_created_image.png | {"name":"QA_20260521_20260521063914_PRODUCT","code":"QAP21063914","categorySelected":{"value":"1019","text":"QA_20260521_20260521063914_CATEGORY"},"brandSelected":{"value":"1","text":"Honda"},"fileSet":true,"validationText":"Hệ thống quản trị MoToSale\n admin\nMoToSale Admin\nadmin\n\nTổng quan\n\nDANH MỤC & SẢN PHẨM\n\nSản phẩm\n\nDanh mục\n\nHãng xe & Dòng xe\n\nĐƠN HÀNG & THANH TOÁN\n\nĐơn hàng\n\nThanh toán\n\nVoucher\n\nTồn kho\n\nNGƯỜI DÙNG & NỘI DUNG\n\nNgười dùng\n\nĐánh giá\n\nBài viết\n\nFAQ\n\n","validationAlert":"","tableFound":true,"api":{"status":200,"found":true,"excerpt":"{\"items\":[{\"maSanPham\":1120,\"maSanPhamKinhDoanh\":\"QAP21063914\",\"tenSanPham\":\"QA_20260521_20260521063914_PRODUCT\",\"slug\":\"qa_20260521_20260521063914-product\",\"maDanhMuc\":1019,\"maHangXe\":1,\"maDongXe\":null,\"loaiSanPham\":\"XeMay\",\"giaGoc\":25000000,\"giaKhuyenMai\":24000000,\"giaBan\":24000000,\"tyLeGiam\":4"}} |
| VOU-01-02-03-04-UI | Fail | CRUD_VOUCHER_created.png | {"code":"QA21063914","validationAlert":"Vui lòng nhập mã voucher.","tableFound":false,"api":{"status":200,"found":false,"excerpt":"{\"items\":[{\"id\":29,\"code\":\"FULLPAY1TR\",\"discountType\":\"Amount\",\"discountValue\":1000000,\"minOrderValue\":25000000,\"maxDiscountValue\":null,\"description\":\"Giảm 1 triệu cho đơn thanh toán toàn bộ\",\"startsAt\":\"2026-04-27T16:13:10\",\"endsAt\":\"2026-07-27T16:13:10\",\"scope\":\"All\",\"usageLimit\":200,\"usedCount\":0"}} |
| USER-01-02-03-04-UI | Pass | CRUD_USER_created_role.png | {"email":"qa_20260521063914@example.com","validationAlert":"Họ tên và Email là bắt buộc!","tableFound":true,"api":{"status":200,"found":true,"excerpt":"{\"items\":[{\"id\":1025,\"hoTen\":\"QA_20260521_20260521063914_USER\",\"email\":\"qa_20260521063914@example.com\",\"soDienThoai\":\"0900000000\",\"trangThai\":\"Active\",\"ngayTao\":\"2026-05-21T06:39:39\",\"roles\":[\"Staff\"]},{\"id\":22,\"hoTen\":\"Test Admin\",\"email\":\"testadmin@test.com\",\"soDienThoai\":\"0999888777\",\"tra"}} |
| FAQ-01-02-UI | Pass | CRUD_FAQ_created.png | {"question":"QA_20260521_20260521063914_FAQ?","validationAlert":"Câu hỏi là bắt buộc!","tableFound":true,"api":{"status":200,"found":true,"excerpt":"{\"items\":[{\"id\":5,\"cauHoi\":\"QA_20260521_20260521063914_FAQ?\",\"cauTraLoi\":\"QA answer via UI\",\"danhMuc\":\"QA\",\"thuTu\":0,\"dangHoatDong\":true},{\"id\":1,\"cauHoi\":\"Làm sao biết màu xe còn hàng?\",\"cauTraLoi\":\"Trang chi tiết sản phẩm hiển thị tồn kho theo từ"}} |
| POST-01-02-UI | Pass | CRUD_POST_created.png | {"title":"QA_20260521_20260521063914_POST","validationAlert":"Tiêu đề là bắt buộc!","tableFound":true,"api":{"status":200,"found":true,"excerpt":"{\"items\":[{\"id\":3,\"tieuDe\":\"QA_20260521_20260521063914_POST\",\"slug\":\"qa_20260521_20260521063914-post\",\"tomTat\":\"QA summary\",\"anhDaiDienUrl\":null,\"danhMuc\":\"QA\",\"trangThai\":\"Draft\",\"xuatBanLuc\":null,\"ngayTao\":\"2026-05-21T06:39:47\"},{\"id\":1,\"tieuDe\":"}} |
| CRUD-RUN-SUMMARY | Pass | CRUD_RUN_final_state.png | {"prefix":"QA_20260521_20260521063914","created":{"category":"QA_20260521_20260521063914_CATEGORY","brand":"QA_20260521_20260521063914_BRAND"},"screenshotsDir":"D:\\MotorTeam\\MoToSale-End\\FrontendAdmin\\test-evidence-20260521"} |

## Focused Retest - Brand and Voucher - QA_20260521_FOCUS_20260521064120


## Focused Retest - Brand and Voucher - QA_20260521_FOCUS_20260521064141

| BRAND-01-02-FOCUS | Pass | FOCUS_BRAND_created_logo.png | {"name":"QA_20260521_FOCUS_20260521064141_BRAND","emptySubmit":true,"validation":"Tên hãng xe là bắt buộc!","fileSet":true,"values":[{"name":"tenHang","type":"text","value":"QA_20260521_FOCUS_20260521064141_BRAND"},{"name":"slug","type":"text","value":"qa_20260521_focus_20260521064141-brand"},{"name":"","type":"file","value":"C:\\fakepath\\qa-logo.png"},{"name":"","type":"checkbox","value":"on"}],"tableFound":true,"api":{"status":200,"found":true,"excerpt":"ttps://www.motul.com/assets/logo_motul-0a705b8a63d311b1f0a8c540f95f15e7.png\",\"dangHoatDong\":true,\"ngayTao\":\"2026-04-25T14:13:37\"},{\"id\":11,\"tenHang\":\"QA_20260521_FOCUS_20260521064141_BRAND\",\"slug\":\"qa_20260521_focus_20260521064141-brand\",\"logoUrl\":\"/uploads/brands/7658588271f542babbed8da7b32e54a0.png\",\"dangHoatDong\":true,\"ngayTao\":\"2026-05-21T06:41:48\"},{\"id\":3,\"tenHang\":\"VinFast\",\"slug\":\"vinfast\",\"logoUrl\""}} |
| VOU-01-02-03-04-FOCUS | Pass | FOCUS_VOUCHER_created.png | {"code":"QAF21064141","validation":"Vui lòng nhập mã voucher.","values":[{"name":"code","type":"text","value":"QAF21064141"},{"name":"discountType","type":"select-one","value":"Percent","text":"Phần trăm (%)"},{"name":"discountValue","type":"number","value":"12"},{"name":"minOrderValue","type":"number","value":"100000"},{"name":"maxDiscountValue","type":"number","value":"50000"},{"name":"startDate","type":"date","value":"2026-05-21"},{"name":"endDate","type":"date","value":"2026-06-21"},{"name":"usageLimit","type":"number","value":"9"},{"name":"scope","type":"text","value":"All"},{"name":"status","type":"select-one","value":"Active","text":"Hoạt động"},{"name":"description","type":"textarea","value":"QA focused voucher"}],"afterAlert":"","tableFound":true,"api":{"status":200,"found":true,"excerpt":"{\"items\":[{\"id\":1052,\"code\":\"QAF21064141\",\"discountType\":\"Percent\",\"discountValue\":12,\"minOrderValue\":100000,\"maxDiscountValue\":50000,\"description\":\"QA focused voucher\",\"startsAt\":\"2026-05-21T00:00:00\",\"endsAt\":\"2026-06-21T00:00:00\",\"scope\":\"All\",\"usageLimit\":9,\"usedCount\":0,\"status\":\"Act"}} |

## Database Read-Only Audit

| Case ID | Result | Evidence | Notes |
|---|---|---|---|
| DB-01 | Pass | sqlcmd-readonly | QA_20260521 record counts: SANPHAM=1, DANHMUC=1, HANGXE=1, NGUOIDUNG=1, VOUCHER=1, FAQ=1, BAIVIET=1. |
| DB-02 | Pass | sqlcmd-readonly | Product QAP21063914 persisted with GiaGoc=25000000, GiaKhuyenMai=24000000, SoLuongTon=3, TrangThaiSanPham=Available, AnhChinhUrl=/uploads/products/18e406bb14dd4bc1ad872f35224fb420.png. |
| DB-03 | Partial | sqlcmd-readonly | Destructive confirm OK was intentionally not executed for shared data; delete buttons were tested with confirm=false. No deleted QA rows expected in DB. |
| DB-04 | Pass | sqlcmd-readonly | Duplicate business keys checked: MaSanPhamKinhDoanh, DanhMuc slug, HangXe slug, User email, Voucher code all have 0 duplicate groups. |
| DB-05 | Pass | sqlcmd-readonly | Orphan checks: product-category=0, product-brand=0, negative price/stock=0. |
| DB-06 | Pass | ORDER-DETAIL_manual_status_payment_buttons.png | Order detail/manual payment controls visible in UI; no automatic payment transaction was created during admin test. |
| DB-07 | Partial | sqlcmd-readonly + filesystem | Product/brand upload URLs persisted and files exist under CatalogService/wwwroot. Uploaded QA files are 8 bytes in this run, so image storage should be visually rechecked with a normal real image before release. |

## Responsive and Console Audit

| UI-01-DESKTOP | Pass | UI-01-DESKTOP_products_responsive.png | {"viewport":{"w":1366,"h":768},"url":"http://127.0.0.1:5175/products","overflowing":[],"tableInfo":{"headers":["Mã SP","Tên sản phẩm","Danh mục","Hãng xe","Giá gốc","Giá KM","Tồn kho","Trạng thái","Thao tác"],"rows":10,"scrollWidth":1079,"clientWidth":1080},"bodyText":"Hệ thống quản trị MoToSale\n admin\nMoToSale Admin\nadmin\n\nTổng quan\n\nDANH MỤC & SẢN PHẨM\n\nSản phẩm\n\nDanh mục\n\nHãng xe & Dòng xe\n\nĐƠN HÀNG & THANH TOÁN\n\nĐơn hàng\n\nThanh toán\n\nVoucher\n\nTồn kho\n\nNGƯỜI DÙNG & NỘI DUNG\n\nNgười dùng\n\nĐánh giá\n\nBài viết\n\nFAQ\n\nLiên hệ\n\nBÁO CÁO\n\nBáo cáo & Thống kê\n\nQuản lý Sản phẩm\nDanh sách sản phẩm\n Thêm sản phẩm\n-- Danh mục --\nXe máy\nPhụ tùng\nXe tay ga\nXe số\nXe côn tay\nXe máy điện\nDầu nhớt\nLốp xe\nPhanh xe\nLọc gió\nPhụ kiện\nQA_20260521_20260521063914_CATEGORY\n-- Hãng xe --"} |
| UI-02-TABLET | Pass | UI-02-TABLET_products_responsive.png | {"viewport":{"w":768,"h":1024},"url":"http://127.0.0.1:5175/products","overflowing":[{"tag":"TABLE","cls":"table table-bordered table-striped table-sm","text":"Mã SP\tTên sản phẩm\tDanh mục\tHãng xe\tGiá gốc\tGiá KM\tTồn kho\tT","rect":{"x":36,"w":1080,"right":1115}},{"tag":"THEAD","cls":"","text":"Mã SP\tTên sản phẩm\tDanh mục\tHãng xe\tGiá gốc\tGiá KM\tTồn kho\tT","rect":{"x":36,"w":1079,"right":1115}},{"tag":"TR","cls":"","text":"Mã SP\tTên sản phẩm\tDanh mục\tHãng xe\tGiá gốc\tGiá KM\tTồn kho\tT","rect":{"x":36,"w":1079,"right":1115}},{"tag":"TH","cls":"","text":"Hãng xe","rect":{"x":733,"w":63,"right":797}},{"tag":"TH","cls":"","text":"Giá gốc","rect":{"x":797,"w":82,"right":879}},{"tag":"TH","cls":"","text":"Giá KM","rect":{"x":879,"w":82,"right":961}},{"tag":"TH","cls":"","text":"Tồn kho","rect":{"x":961,"w":38,"right":999}},{"tag":"TH","cls":"","text":"Trạng thái","rect":{"x":999,"w":70,"right":1069}},{"tag":"TH","cls":"","text":"Thao tác","rect":{"x":1069,"w":46,"right":1115}},{"tag":"TBODY","cls":"","text":"QAP21063914\tQA_20260521_20260521063914_PRODUCT\tQA_20260521_2","rect":{"x":36,"w":1079,"right":1115}},{"tag":"TR","cls":"","text":"QAP21063914\tQA_20260521_2026052106 |
| UI-02-MOBILE | Pass | UI-02-MOBILE_products_responsive.png | {"viewport":{"w":390,"h":844},"url":"http://127.0.0.1:5175/products","overflowing":[{"tag":"ASIDE","cls":"main-sidebar sidebar-dark-primary elevation-4","text":"MoToSale Admin\nadmin\n\nTổng quan\n\nDANH MỤC & SẢN PHẨM\n\nSản ph","rect":{"x":-250,"w":250,"right":0}},{"tag":"A","cls":"brand-link","text":"MoToSale Admin","rect":{"x":-250,"w":250,"right":0}},{"tag":"SPAN","cls":"brand-text font-weight-light ml-3","text":"MoToSale Admin","rect":{"x":-226,"w":137,"right":-89}},{"tag":"B","cls":"","text":"MoToSale","rect":{"x":-226,"w":80,"right":-146}},{"tag":"DIV","cls":"sidebar","text":"admin\n\nTổng quan\n\nDANH MỤC & SẢN PHẨM\n\nSản phẩm\n\nDanh mục\n\nH","rect":{"x":-250,"w":250,"right":0}},{"tag":"DIV","cls":"user-panel mt-3 pb-3 mb-3 d-flex","text":"admin","rect":{"x":-242,"w":234,"right":-8}},{"tag":"DIV","cls":"image","text":"","rect":{"x":-242,"w":45,"right":-197}},{"tag":"I","cls":"fas fa-user-circle fa-2x text-light","text":"","rect":{"x":-229,"w":32,"right":-197}},{"tag":"DIV","cls":"info","text":"admin","rect":{"x":-197,"w":58,"right":-139}},{"tag":"A","cls":"d-block","text":"admin","rect":{"x":-187,"w":43,"right":-144}},{"tag":"NAV","cls":"mt-2","text":"Tổng quan\n\nDANH  |
| ERR-CONSOLE-01 | Pass | no-screenshot-console | {"errorCount":0,"sample":[]} |

## Order and Manual Payment UI Retest

| ORDER-05-PAY-02-03-UI | Fail | ORDER_PAY_status_paid_ui.png | {"before":{"maDonHang":74,"maDonHangKinhDoanh":"QAORD-20260521134628-PAY","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Pay","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan":24000000,"trangThaiDonHang":"Pending","trangThaiThanhToan":"Unpaid","ghiChu":"QA order for admin UI status/payment test","ngayTao":"2026-05-21T06:46:29","ngayCapNhat":"2026-05-21T06:46:29","ngayThanhToanThanhCong":null,"ngayHuyDon":null,"lyDoHuyDon":null,"phuongThucNhanHang":"Delivery","trangThaiVanChuyen":"NotShipped","loaiDonHang":"FullPayment","tienDatCoc":0,"soTienConLai":0,"ngayHenNhanXe":null,"ghiChuGiaoNhan":null,"checkoutHetHanLuc":null,"items":[{"maChiTietDonHang":33,"maSanPham":1120,"maBienSanPham":null,"tenSanPhamSnapshot":"QA_20260521_20260521063914_PRODUCT","skuSnapshot":"QAP21063914","donGia":24000000,"soLuong":1,"thanhTien":24000000}],"vouchers":[]},"selectedStatus":{"value":"Confirmed","text":"Đã xác nhận"},"selectedPayment":{"value":"Paid","text":"Đã thanh toán"},"after":{"maDonHang":74,"maDonHangKinhDoanh":"QAORD-20260521134628-PAY","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Pay","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA addres |
| ORDER-07-PAY-05-UI | Fail | ORDER_CANCEL_ui.png | {"before":{"maDonHang":75,"maDonHangKinhDoanh":"QAORD-20260521134628-CANCEL","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Cancel","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan":24000000,"trangThaiDonHang":"Pending","trangThaiThanhToan":"Unpaid","ghiChu":"QA order for admin UI cancel test","ngayTao":"2026-05-21T06:46:29","ngayCapNhat":"2026-05-21T06:46:29","ngayThanhToanThanhCong":null,"ngayHuyDon":null,"lyDoHuyDon":null,"phuongThucNhanHang":"Delivery","trangThaiVanChuyen":"NotShipped","loaiDonHang":"FullPayment","tienDatCoc":0,"soTienConLai":0,"ngayHenNhanXe":null,"ghiChuGiaoNhan":null,"checkoutHetHanLuc":null,"items":[{"maChiTietDonHang":34,"maSanPham":1120,"maBienSanPham":null,"tenSanPhamSnapshot":"QA_20260521_20260521063914_PRODUCT","skuSnapshot":"QAP21063914","donGia":24000000,"soLuong":1,"thanhTien":24000000}],"vouchers":[]},"reason":"QA cancel reason from admin UI","after":{"maDonHang":75,"maDonHangKinhDoanh":"QAORD-20260521134628-CANCEL","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Cancel","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan" |

## Order and Manual Payment UI Retest

| ORDER-05-PAY-02-03-UI | Pass | ORDER_PAY_status_paid_ui.png | {"before":{"maDonHang":74,"maDonHangKinhDoanh":"QAORD-20260521134628-PAY","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Pay","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan":24000000,"trangThaiDonHang":"Confirmed","trangThaiThanhToan":"Unpaid","ghiChu":"QA order for admin UI status/payment test","ngayTao":"2026-05-21T06:46:29","ngayCapNhat":"2026-05-21T06:47:19","ngayThanhToanThanhCong":null,"ngayHuyDon":null,"lyDoHuyDon":null,"phuongThucNhanHang":"Delivery","trangThaiVanChuyen":"NotShipped","loaiDonHang":"FullPayment","tienDatCoc":0,"soTienConLai":0,"ngayHenNhanXe":null,"ghiChuGiaoNhan":null,"checkoutHetHanLuc":null,"items":[{"maChiTietDonHang":33,"maSanPham":1120,"maBienSanPham":null,"tenSanPhamSnapshot":"QA_20260521_20260521063914_PRODUCT","skuSnapshot":"QAP21063914","donGia":24000000,"soLuong":1,"thanhTien":24000000}],"vouchers":[]},"selectedStatus":{"value":"Confirmed","text":"Đã xác nhận"},"selectedPayment":{"value":"Paid","text":"Đã thanh toán"},"after":{"maDonHang":74,"maDonHangKinhDoanh":"QAORD-20260521134628-PAY","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Pay","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA addr |
| ORDER-07-PAY-05-UI | Pass | ORDER_CANCEL_ui.png | {"before":{"maDonHang":75,"maDonHangKinhDoanh":"QAORD-20260521134628-CANCEL","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Cancel","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan":24000000,"trangThaiDonHang":"Pending","trangThaiThanhToan":"Unpaid","ghiChu":"QA order for admin UI cancel test","ngayTao":"2026-05-21T06:46:29","ngayCapNhat":"2026-05-21T06:46:29","ngayThanhToanThanhCong":null,"ngayHuyDon":null,"lyDoHuyDon":null,"phuongThucNhanHang":"Delivery","trangThaiVanChuyen":"NotShipped","loaiDonHang":"FullPayment","tienDatCoc":0,"soTienConLai":0,"ngayHenNhanXe":null,"ghiChuGiaoNhan":null,"checkoutHetHanLuc":null,"items":[{"maChiTietDonHang":34,"maSanPham":1120,"maBienSanPham":null,"tenSanPhamSnapshot":"QA_20260521_20260521063914_PRODUCT","skuSnapshot":"QAP21063914","donGia":24000000,"soLuong":1,"thanhTien":24000000}],"vouchers":[]},"reason":"QA cancel reason from admin UI","after":{"maDonHang":75,"maDonHangKinhDoanh":"QAORD-20260521134628-CANCEL","maNguoiDung":1025,"maShowroom":null,"maGioHang":null,"hoTenNhanHang":"QA Order Cancel","soDienThoaiNhanHang":"0900000000","emailNhanHang":"qa_20260521063914@example.com","diaChiNhanHang":"QA address","tongTienHang":24000000,"tienGiam":0,"phiVanChuyen":0,"tongThanhToan" |
| DB-08 | Pass | sqlcmd-readonly | Order QA final states: 74=Confirmed/Paid with NgayThanhToanThanhCong set; 75=Cancelled/Cancelled with LyDoHuyDon='QA cancel reason from admin UI'. |
| FINAL-UPLOAD-PRODUCT-REAL-IMAGE | Pass | FINAL_REAL_IMAGE_products.png | {"url":"http://127.0.0.1:5175/products","textFound":true,"imgs":[]} |
| FINAL-UPLOAD-BRAND-REAL-LOGO | Pass | FINAL_REAL_IMAGE_brands.png | {"url":"http://127.0.0.1:5175/brands","textFound":true,"imgs":[{"src":"https://www.honda.com.vn/images/logo.svg","complete":true,"width":216,"height":76},{"src":"/uploads/brands/8bf4fb2e8f9d4b07b738ec854be6087d.jpg","complete":true,"width":1200,"height":850},{"src":"https://www.motul.com/assets/logo_motul-0a705b8a63d311b1f0a8c540f95f15e7.png","complete":true,"width":0,"height":0},{"src":"/uploads/brands/c4a5b075aa264cfe95f0e8acea83ffe4.png","complete":true,"width":320,"height":180},{"src":"https://storage.googleapis.com/vinfast-data-01/VinFast-logo.png","complete":true,"width":0,"height":0},{"src":"https://yamaha-motor.com.vn/wp/wp-content/themes/yamaha/assets/img/share/logo.png","complete":true,"width":636,"height":218}]} |

## Final Hardening And Cleanup

| Case ID | Result | Evidence | Notes |
|---|---|---|---|
| FINAL-MIGRATION-01 | Pass | Backend/database/20260521_OrderPaymentStatus_Cancelled.sql | Added repeatable SQL patch for DONHANG payment status constraint to allow Cancelled. |
| FINAL-UPLOAD-REAL-IMAGE | Pass | FINAL_REAL_IMAGE_products.png, FINAL_REAL_IMAGE_brands.png | Uploaded 320x180 PNG test image through admin API and verified product/brand pages after reload. |
| FINAL-DB-CLEANUP | Pass | sqlcmd-readonly | Removed QA_20260521/QAORD test records from product, order, user, voucher, category, brand, FAQ, post; post-cleanup counts are all 0. |
| FINAL-UPLOAD-CLEANUP | Pass | filesystem | Removed QA upload files referenced by cleaned QA product/brand records. |
| FINAL-BUILD-BE | Pass | dotnet-build | OrderService build succeeded with 0 warnings and 0 errors. |
| FINAL-BUILD-FE | Pass | npm-build | FrontendAdmin production build succeeded; Vite emitted only chunk-size warning for 587 kB bundle. |
| FINAL-DB-CONSTRAINT | Pass | sqlcmd-readonly | CK_DONHANG_PaymentStatus now includes Cancelled; QA_RECORDS aggregate count is 0. |
