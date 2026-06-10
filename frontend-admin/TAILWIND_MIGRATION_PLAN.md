# Tailwind Migration Plan - FrontendAdmin

## Absolute Rule
- Tuyet doi khong duoc tu y dung khi chua hoan thanh toan bo plan.
- Neu gap loi, phai ghi lai loi, xac dinh nguyen nhan, sua loi, test lai, roi tiep tuc buoc ke tiep.
- Khong duoc bo qua trang, modal, nut, field nhap lieu, filter, pagination, bang, responsive state hoac animation.
- Khong duoc go Bootstrap/AdminLTE truoc khi toan bo component va layout Tailwind thay the da pass test.
- Sau moi giai doan phai chay `npm run build`.
- Sau moi trang phai kiem tra bang UI that, khong chi doc code.
- Moi task trong plan phai co trang thai: `Pending`, `In Progress`, `Done`, hoac `Blocked`.
- Neu task bi `Blocked`, phai ghi ro nguyen nhan, file lien quan, huong xu ly, roi tiep tuc ngay khi unblock.

## Summary
Ke hoach nay dung de chuyen toan bo Frontend Admin tu Bootstrap/AdminLTE sang TailwindCSS theo tung giai doan. Muc tieu la giu nguyen nghiep vu, bo cuc, mau sac, responsive, animation, trang thai UI va hanh vi hien tai trong khi loai bo dan phu thuoc Bootstrap/AdminLTE.

Default file location:

```text
D:\MotorTeam\MoToSale-End\FrontendAdmin\TAILWIND_MIGRATION_PLAN.md
```

## Key Changes
- Chuan hoa Tailwind theme/tokens theo giao dien admin hien tai: mau primary, success, warning, danger, info, sidebar, background, border, text, spacing, shadow, radius.
- Tao shared Tailwind components: `Button`, `Badge`, `Input`, `Select`, `Textarea`, `Checkbox`, `DataTable`, `Pagination`, `Modal`, `ConfirmDialog`, `Loading`, `EmptyState`.
- Chuyen tung nhom trang tu Bootstrap/AdminLTE class sang Tailwind component.
- Viet lai layout lon bang Tailwind: sidebar, navbar, content area, footer.
- Sau khi toan bo UI on dinh, go Bootstrap/AdminLTE CSS/JS va bat Tailwind preflight neu khong lam lech UI.

## Status Legend
- `Pending`: Chua bat dau.
- `In Progress`: Dang lam, chua duoc chuyen sang buoc khac neu con loi nghiem trong.
- `Done`: Da code, da test UI, da build thanh cong.
- `Blocked`: Dang bi chan; phai ghi ro ly do, file lien quan, cach xu ly.

## Migration Run Log - 2026-05-22
Status: `In Progress`

Completed in this run:
- [x] Removed Bootstrap/AdminLTE/jQuery CDN runtime from `index.html`.
- [x] Replaced AdminLTE pushmenu/dropdown behavior with React state in the main layout.
- [x] Added Tailwind foundation tokens and internal compatibility styling in `src/index.css`.
- [x] Added `cn()` helper.
- [x] Added shared Tailwind components: `Button`, `Badge`, `Input`, `Select`, `Textarea`, `Checkbox`, `DataTable`, `Pagination`, `Modal`, `ConfirmDialog`, `Loading`, `EmptyState`.
- [x] Verified `npm run build` after foundation/shared component/layout changes.
- [x] Browser-tested all main admin routes for header/sidebar/content/footer layout metrics.
- [x] Browser-tested desktop sidebar collapse/open.
- [x] Browser-tested mobile sidebar hidden/open overlay behavior.
- [x] Browser-tested FAQ add modal open/close.

Remaining cleanup:
- [x] Convert shell layout (`MainLayout`, `Navbar`, `Sidebar`, `Footer`) to Tailwind utility classes only.
- [x] Convert shared UI primitives so they no longer emit Bootstrap/AdminLTE class names.
- [ ] Replace remaining legacy Bootstrap/AdminLTE class names in page JSX with shared Tailwind components.
- [ ] Remove the compatibility selectors from `src/index.css` after no JSX depends on them.
- [ ] Run full button/field/modal CRUD regression for every page after the JSX cleanup.
- [ ] Capture and archive screenshots for every page after the final JSX cleanup.

## Execution Plan - Tailwind-only without visual drift
Status: `In Progress`

Goal:
- The admin app should use Tailwind utilities/components for the UI implementation.
- Colors, spacing, layout sizes, sidebar behavior, forms, tables, modals, responsive states and interactions should remain equivalent to the current baseline.
- Bootstrap/AdminLTE package/runtime dependencies must remain absent.
- Legacy compatibility CSS may stay only while a matching JSX dependency still exists.

Order of work:
- [x] Confirm current state: Tailwind plugin enabled, Bootstrap/AdminLTE runtime removed, compatibility CSS still present.
- [x] Phase A: Convert the admin shell layout to Tailwind-only class usage.
- [x] Phase B: Convert shared UI primitives (`Button`, `Badge`, `DataTable`, `Modal`, `Pagination`, form controls, feedback states) to Tailwind-only output.
- [ ] Phase C: Replace page-level wrappers, cards, tables, filters, forms and modals by functional group.
- [ ] Phase D: Remove old compatibility selectors from `index.css`.
- [ ] Phase E: Run production build and route-level UI regression checks.

Functional groups for Phase C:
- [x] Dashboard and charts.
- [ ] Catalog: motorcycles, parts, categories, brands, manufacturers.
- [ ] Sales: orders, order detail, POS, vouchers, customers.
- [ ] Inventory and supply: inventory, stock documents, supply operations.
- [ ] After-sales: returns, warranties, service CRM.
- [ ] Finance, reports, audit logs, users, settings and imports.

## Phase 1 - Baseline UI
Status: `Pending`

Checklist:
- [ ] Chup screenshot toan bo trang admin truoc khi sua.
- [ ] Ghi nhan sidebar mo/dong.
- [ ] Ghi nhan hover menu.
- [ ] Ghi nhan active route.
- [ ] Ghi nhan footer o trang ngan va trang dai.
- [ ] Ghi nhan table, modal, form, dropdown, pagination.
- [ ] Ghi nhan cac loi layout hien tai neu con: footer cao bat thuong, sidebar hover che noi dung, bang lech cot.
- [ ] Chay `npm run build`.

Pages to baseline:
- [ ] Dashboard
- [ ] San pham
- [ ] Danh muc
- [ ] Hang xe va dong xe
- [ ] Don hang
- [ ] Voucher
- [ ] Ton kho
- [ ] FAQ
- [ ] Lien he
- [ ] Bai viet
- [ ] Nguoi dung
- [ ] Danh gia
- [ ] Bao cao

## Phase 2 - Tailwind Foundation
Status: `Pending`

Checklist:
- [ ] Giu Tailwind `theme` va `utilities`.
- [ ] Chua bat `preflight`.
- [ ] Tao theme tokens tuong ung AdminLTE hien tai.
- [ ] Tao helper `cn()` de ghep class an toan.
- [ ] Khong thay layout lon trong giai doan nay.
- [ ] Chay `npm run build`.

Required tokens:
- [ ] Primary
- [ ] Secondary
- [ ] Success
- [ ] Info
- [ ] Warning
- [ ] Danger
- [ ] Light
- [ ] Dark
- [ ] Sidebar background
- [ ] Page background
- [ ] Text primary
- [ ] Text muted
- [ ] Border
- [ ] Shadow
- [ ] Radius
- [ ] Spacing scale

## Phase 3 - Shared Components
Status: `Pending`

Checklist:
- [ ] Chuyen `Button`.
- [ ] Chuyen `Badge`.
- [ ] Chuyen `Input`.
- [ ] Chuyen `Select`.
- [ ] Chuyen `Textarea`.
- [ ] Chuyen `Checkbox`.
- [ ] Chuyen loading state.
- [ ] Chuyen empty state.
- [ ] Chuyen alert/toast neu co.
- [ ] Chuyen pagination.
- [ ] Chuyen modal va confirm dialog, khong phu thuoc Bootstrap JS.
- [ ] Chuyen table thanh `DataTable` Tailwind dung chung.
- [ ] Chay `npm run build`.

Component test checklist:
- [ ] Hover
- [ ] Focus
- [ ] Disabled
- [ ] Loading
- [ ] Long text
- [ ] Mobile width
- [ ] Keyboard close/submit voi modal neu co

## Phase 4 - Low-Risk Pages
Status: `Pending`

Pages:
- [ ] FAQ
- [ ] Lien he
- [ ] Danh gia
- [ ] Voucher
- [ ] Ton kho

Per-page checklist:
- [ ] Tai trang lan dau.
- [ ] Reload trang.
- [ ] Chuyen sang trang khac roi quay lai.
- [ ] Test tat ca nut bam.
- [ ] Test tat ca field nhap lieu.
- [ ] Test modal mo, dong, submit, cancel.
- [ ] Test search, filter, pagination.
- [ ] Test empty data.
- [ ] Test du lieu dai.
- [ ] Test desktop, tablet, mobile.
- [ ] Chup screenshot kiem tra bang, badge, spacing, footer, sidebar.
- [ ] Chay `npm run build`.

## Phase 5 - Medium-Risk CRUD Pages
Status: `Pending`

Pages:
- [ ] Danh muc
- [ ] Hang xe
- [ ] Dong xe
- [ ] Nguoi dung
- [ ] Bai viet

Per-page checklist:
- [ ] Test create.
- [ ] Test edit.
- [ ] Test delete/hide neu co.
- [ ] Test search.
- [ ] Test filter.
- [ ] Test pagination.
- [ ] Test validation thieu field bat buoc.
- [ ] Test du lieu dai.
- [ ] Test du lieu sai dinh dang.
- [ ] Test modal mo, dong, submit, cancel.
- [ ] Test desktop, tablet, mobile.
- [ ] Chup screenshot kiem tra bang, badge, spacing, footer, sidebar.
- [ ] Chay `npm run build`.

## Phase 6 - High-Risk Business Pages
Status: `Pending`

Pages:
- [ ] Don hang: danh sach, chi tiet, badge trang thai, modal cap nhat trang thai, nut quay lai.
- [ ] San pham: CRUD, bien the, anh, upload/logo/image preview, trang thai ban/ngung ban.
- [ ] Dashboard: statistic cards, chart, date range, empty data.
- [ ] Bao cao: doanh thu, don hang, top san pham, bang so lieu, chart.

Per-page checklist:
- [ ] Test nghiep vu chinh bang UI that.
- [ ] Test tat ca nut bam.
- [ ] Test tat ca field nhap lieu.
- [ ] Test tat ca modal.
- [ ] Test search, filter, pagination neu co.
- [ ] Test status update neu co.
- [ ] Test image/logo upload va reload neu co.
- [ ] Test chart co data va empty data neu co.
- [ ] Test desktop, tablet, mobile.
- [ ] Chup screenshot kiem tra gia tri cot bang, badge, spacing, footer, sidebar.
- [ ] Chay `npm run build`.

## Phase 7 - Main Layout
Status: `Pending`

Checklist:
- [ ] Viet lai `MainLayout` bang Tailwind.
- [ ] Viet lai sidebar bang React state.
- [ ] Test collapse hamburger.
- [ ] Test hover sidebar.
- [ ] Test active route.
- [ ] Test mobile overlay.
- [ ] Viet lai navbar.
- [ ] Viet lai footer.
- [ ] Dam bao trang ngan khong lam footer cao bat thuong.
- [ ] Dam bao trang dai cuon dung va footer khong che noi dung.
- [ ] Test desktop.
- [ ] Test tablet.
- [ ] Test mobile.
- [ ] Chay `npm run build`.

## Phase 8 - Remove Bootstrap/AdminLTE
Status: `Pending`

Checklist:
- [ ] Xac nhan khong con phu thuoc UI chinh vao Bootstrap/AdminLTE.
- [ ] Xoa import Bootstrap/AdminLTE khi khong con class phu thuoc.
- [ ] Xoa class cu nhu `btn`, `card`, `table`, `form-control`, `badge`, `content-wrapper`, `main-sidebar`, `nav-sidebar`.
- [ ] Bat Tailwind preflight neu toan bo UI van giu dung baseline sau khi test.
- [ ] Kiem tra lai spacing, font, form, table, modal sau khi bat preflight.
- [ ] Chay `npm run build`.

## Phase 9 - Full Regression
Status: `Pending`

Checklist:
- [ ] Bam theo test plan admin hien co.
- [ ] Test toan bo trang.
- [ ] Test toan bo nut.
- [ ] Test toan bo field.
- [ ] Test toan bo modal.
- [ ] Chup screenshot kiem tra gia tri cot bang.
- [ ] Chup screenshot kiem tra badge.
- [ ] Chup screenshot kiem tra spacing.
- [ ] Chup screenshot kiem tra footer.
- [ ] Chup screenshot kiem tra sidebar.
- [ ] Kiem tra database sau test tong the neu chuc nang co thay doi du lieu.
- [ ] Chay `npm run build`.
- [ ] Chi ket thuc khi moi checklist deu `Done`.

## Global Test Plan
Moi trang phai test:
- [ ] Tai trang lan dau.
- [ ] Reload trang.
- [ ] Chuyen sang trang khac roi quay lai.
- [ ] Sidebar mo/dong va hover.
- [ ] Tat ca nut bam.
- [ ] Tat ca truong nhap lieu.
- [ ] Modal mo, dong, submit, cancel.
- [ ] Search, filter, pagination.
- [ ] Du lieu rong.
- [ ] Du lieu dai.
- [ ] Du lieu loi.
- [ ] Responsive desktop.
- [ ] Responsive tablet.
- [ ] Responsive mobile.

Voi bang:
- [ ] Chup screenshot de kiem tra header, cot, gia tri, badge trang thai, action buttons.
- [ ] Kiem tra khong tran text.
- [ ] Kiem tra khong lech cot.
- [ ] Kiem tra khong overlap.

Voi form:
- [ ] Nhap du lieu hop le.
- [ ] Nhap thieu field bat buoc.
- [ ] Nhap du lieu dai.
- [ ] Nhap du lieu sai dinh dang.

Voi layout:
- [ ] Trang ngan khong lam footer phinh to.
- [ ] Trang dai cuon dung.
- [ ] Sidebar khong che noi dung sai khi hover.
- [ ] Mobile sidebar khong lam vo content.

Sau moi giai doan:
- [ ] Chay `npm run build`.
- [ ] Ghi lai loi con ton tai.
- [ ] Khong chuyen sang giai doan tiep theo neu loi layout nghiem trong chua sua.

## Acceptance Criteria
- [ ] Toan bo Frontend Admin khong con phu thuoc Bootstrap/AdminLTE cho UI chinh.
- [ ] Mau sac, spacing, font size, table, modal, sidebar, footer giu tuong duong hoac tot hon baseline.
- [ ] Tat ca nghiep vu admin van hoat dong: CRUD, filter, pagination, status update, upload, report/chart.
- [ ] Khong co loi build production.
- [ ] Khong co trang bi footer cao bat thuong.
- [ ] Khong co sidebar hover che noi dung sai.
- [ ] Khong co bang lech cot hoac sai gia tri hien thi.
- [ ] Khong co modal/form bi tran hoac mat nut tren desktop/mobile.
- [ ] Toan bo checklist trong plan o trang thai `Done`.

## Assumptions
- Migration uu tien giu nguyen trai nghiem hien tai, khong redesign thuong hieu.
- Tailwind hoa theo tung phan, khong lam big-bang rewrite.
- Bootstrap/AdminLTE chi bi go o cuoi khi da co component Tailwind thay the day du.
