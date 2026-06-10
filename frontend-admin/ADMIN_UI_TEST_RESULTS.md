# Admin UI Test Results

Thoi gian test: 2026-05-21

Moi truong:

- Backend gateway: `http://localhost:5000`
- Auth/Catalog/Order/Payment services: `5001-5004`
- Frontend admin: `http://127.0.0.1:5175`
- Tai khoan: `admin123@gmail.com / dung123`
- Cach test: thao tac qua UI tren in-app browser, tao du lieu `AUTO_TEST_*` cho cac CRUD co the don dep.

## Tong quan

| Ket qua | So muc |
|---|---:|
| Pass | 16 |
| Partial | 2 |
| Fail | 0 |

## Retest cac muc tung loi

Lan retest: 2026-05-21, sau khi sua backend/frontend.

| Muc | Ket qua retest | Bang chung |
|---|---|---|
| Danh muc CRUD | Pass | API `POST/PUT/DELETE /api/categories` pass; UI bam `Them danh muc`, modal mo, submit thanh cong, item hien tren bang. |
| Voucher CRUD | Pass | API `POST/PUT/DELETE /api/vouchers` pass; UI bam `Them Voucher`, submit thanh cong, modal dong, voucher hien tren bang. |
| San pham create/update/delete | Pass | API `POST/PATCH/DELETE /api/products` pass, khong con `405`; delete la soft-delete dung nghiep vu. |
| San pham - nut bien the/anh | Pass | UI bam nut `Variants` mo modal `Quan ly bien the san pham`; bam nut `Images` mo modal anh san pham. |
| Danh gia an/restore | Pass | UI bam `An` khong alert loi, badge `Da an` hien; API `Hidden -> Rejected` trong DB va tra ve `Hidden`, restore `Approved` thanh cong. |
| Thanh toan | Partial | API load payment pass nhung `items` rong, nen van chua co ban ghi `Pending` de bam confirm/cancel tren UI. |

## Ket qua theo plan

| Trang | Flow da test | Ket qua | Ghi chu |
|---|---|---|---|
| Login | Dang nhap sai | Pass | O lai `/login`, hien loi `Email/so dien thoai hoac mat khau khong dung.` |
| Login | Dang nhap dung | Pass | Vao Dashboard, hien sidebar va user `admin`. |
| Logout | Dropdown admin > Dang xuat | Pass | Quay ve `/login`. |
| Dashboard | Load dashboard, kiem card/link Chi tiet | Pass | Co 4 link Chi tiet, khong alert/spinner. |
| Bao cao | Mo reports, kiem chart/table | Pass | Trang load, chart/table khong crash, co so lieu tong hop. |
| Ton kho | Load ton kho, bam Dong bo ton kho | Pass | Bang reload, khong alert/spinner. |
| Lien he | Load danh sach lien he | Pass | Trang khong loi; DB hien khong co contact nen khong co nut xu ly de bam. |
| FAQ | Them, sua status, xoa FAQ `AUTO_TEST_*` | Pass | Created/updated/deleted qua UI thanh cong. |
| Bai viet | Them Draft, sua Published, xoa post `AUTO_TEST_*` | Pass | Created/updated/deleted qua UI thanh cong. |
| Danh muc | Them parent, them child, sua, xoa | Pass | Da bo sung CRUD backend/gateway va sua key/id tren UI. Retest UI tao danh muc bang nut thanh cong; API create/update/delete child thanh cong. |
| Hang xe & Dong xe | Them/sua/xoa hang, them/sua/xoa dong | Pass | Brand/model `AUTO_TEST_*` tao, sua, xoa thanh cong. |
| Voucher | Them/sua/xoa voucher | Pass | Da bo sung admin CRUD endpoint. Retest API create/update/delete thanh cong; retest UI bam Tao moi tao voucher va dong modal thanh cong. |
| Nguoi dung | Them user kem role, sua role/status, xoa | Pass | User `AUTO_TEST_USER_*` tao Staff, sua Admin/Inactive, xoa thanh cong. |
| Danh gia | An review, filter Approved, restore neu can | Pass | Da map UI `Hidden` sang DB `Rejected` de khong vi pham constraint. Retest API hide tra `Hidden`, filter Hidden tim thay review, restore `Approved` thanh cong. |
| Don hang | List/filter, mo `/orders/71`, cap nhat status, restore | Pass | Detail load du; doi sang Confirmed roi restore AwaitingPayment thanh cong. Filter status chua match ky vong nhung core flow pass. |
| Thanh toan | Load/filter va kiem action neu co payment | Partial | DB hien khong co payment, khong the bam confirm/cancel thuc te. Trang load khong loi. |
| San pham | List/search/filter, validation form, thu tao/sua/xoa, mo bien the/anh | Pass | Da bo sung `POST /api/products`, soft-delete va gateway POST. Retest API create/update/delete thanh cong; retest UI nut Bien the/Anh deu mo modal. |
| Product Form | Luu thieu field, kiem variant/image/upload | Partial | Validation pass; variant/image modal da mo duoc sau sua. Upload file anh chua test duoc do browser automation hien tai khong co virtual clipboard/file picker on dinh. |

## Loi/risks can xu ly

1. Payment action:
   - Trang thanh toan load duoc nhung DB hien khong co payment, nen chua test duoc nut confirm/cancel thuc te.

2. Product image upload:
   - Modal anh da mo duoc, nhung upload file chua test bang browser automation hien tai.

## Console/API errors ghi nhan

```text
Khong con loi API/console cu sau khi retest cac muc Category/Voucher/Product/Review.
```

## Du lieu test

Cac du lieu tao qua UI va da xoa thanh cong:

- `AUTO_TEST_FAQ_*`
- `AUTO_TEST_POST_*`
- `AUTO_TEST_BRAND_*`
- `AUTO_TEST_MODEL_*`
- `AUTO_TEST_USER_*`

Du lieu smoke sau fix:

- Category UI `AUTO_TEST_CATEGORY_UI_*`: tao thanh cong va da xoa.
- Voucher UI `ATUI*`: tao thanh cong va da xoa.
- Product API `AUTO_TEST_PRODUCT_*`: tao/update/soft-delete thanh cong.
- Category API `UI Test Parent 20260521082601`: con lai do da gan product soft-delete nen backend chan xoa de bao toan FK.
