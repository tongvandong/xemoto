# Admin Table Alignment Plan

## Muc tieu
Chuan hoa can le cot bang trong toan bo Frontend Admin de bang de doc hon va dung nghiep vu quan tri.

## Rule bat buoc
- Khong duoc tu y dung khi chua thuc hien het plan.
- Chi thay doi can le/hien thi bang, khong doi logic nghiep vu neu khong can.
- Sau khi sua phai chay `npm run build`.
- Phai kiem tra UI that it nhat cac bang chinh sau khi sua.
- Neu phat hien cot hien sai gia tri trong luc can le, phai ghi lai va sua neu trong pham vi frontend.

## Alignment Rules
| Kieu du lieu | Can le | Ghi chu |
|---|---|---|
| Ten, tieu de, mo ta, noi dung, khach hang, email, dia chi | Trai | De doc theo dong tu trai sang phai |
| ID, ma, SKU, code ngan | Giua | De scan nhanh |
| Ngay, gio, date range | Giua | Format ngan |
| Status, badge, boolean | Giua | Badge nam giua cot |
| Anh, logo, icon | Giua | Khung anh can giua |
| So luong, ton kho, diem, percent | Phai | So sanh chu so de hon |
| Tien, doanh thu, tong tien | Phai | Bat buoc can phai |
| Thao tac/nut bam | Giua | Nut action can giua |
| Long text/message | Trai | Co wrap/truncate neu can |

## CSS Strategy
Them utility class trong `src/index.css`:
- `.table th.table-col-code, .table td.table-col-code`
- `.table th.table-col-date, .table td.table-col-date`
- `.table th.table-col-status, .table td.table-col-status`
- `.table th.table-col-number, .table td.table-col-number`
- `.table th.table-col-money, .table td.table-col-money`
- `.table th.table-col-image, .table td.table-col-image`
- `.table th.table-col-actions, .table td.table-col-actions`
- `.table th.table-col-text, .table td.table-col-text`

## Page Checklist
| Trang | Bang | Trang thai | Ghi chu |
|---|---|---|---|
| Dashboard | Don hang moi nhat | Done | Ma/date/status center, money right |
| Dashboard | Top san pham | Done | Product left, sold/revenue right |
| San pham | Danh sach san pham | Done | Code/status/actions center, money/stock right |
| Danh muc | Danh sach danh muc | Done | ID/order/status/actions center |
| Hang xe | Danh sach hang xe | Done | ID/logo/status/actions center |
| Dong xe | Danh sach dong xe | Done | ID/status/actions center |
| Don hang | Danh sach don hang | Done | Code/date/status/actions center, money right |
| Chi tiet don hang | Items/payment/voucher/holds | Done | Money/quantity right, status center |
| Voucher | Danh sach voucher | Done | Code/date/status/actions center, money/usage right |
| Ton kho | Bang ton kho | Done | Inventory numbers right |
| FAQ | Danh sach FAQ | Done | Order/status/actions center |
| Lien he | Danh sach lien he | Done | Type/status/date/actions center |
| Lien he | Detail table | Done | Label left/value left giu nguyen |
| Danh gia | Danh sach danh gia | Done | Rating/status/date/actions center |
| Bai viet | Danh sach bai viet | Done | Status/date/actions center |
| Nguoi dung | Danh sach nguoi dung | Done | Role/status/date/actions center |
| Bao cao | Top product table | Done | Rank/quantity center/right, revenue right |
| Thanh toan | Neu route/file con ton tai | Done | Money right, status/date/actions center |

## Test Plan
- Chay `npm run build`.
- Mo cac route co bang: `/`, `/products`, `/categories`, `/brands`, `/orders`, `/vouchers`, `/inventory`, `/faq`, `/contacts`, `/reviews`, `/posts`, `/users`, `/reports`.
- Kiem tra header va cell cung can le.
- Kiem tra so tien/so luong can phai.
- Kiem tra status/action can giua.
- Kiem tra text dai khong bi ep qua muc.

## Audit Log
| Thoi gian | Trang | Ket qua | Ghi chu |
|---|---|---|---|
| 2026-05-23 | CSS utilities | Done | Them table-col-* trong src/index.css |
| 2026-05-23 | Tat ca bang admin chinh | Done | Da gan class can le theo loai du lieu cho Dashboard, Products, Categories, Brands/Models, Orders/Detail, Vouchers, Inventory, FAQ, Contacts, Reviews, Posts, Users, Reports, Payments |
| 2026-05-23 | Build | Done | `npm run build` pass; con canh bao chunk size cua Vite |
| 2026-05-23 | UI route check | Done | Da dang nhap admin va kiem tra `/`, `/products`, `/categories`, `/brands`, `/orders`, `/vouchers`, `/inventory`, `/faq`, `/contacts`, `/reviews`, `/posts`, `/users`, `/reports`; khong con unaligned data headers, khong horizontal overflow, footer 38px |
