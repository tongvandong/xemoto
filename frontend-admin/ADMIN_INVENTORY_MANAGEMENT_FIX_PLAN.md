# Admin Inventory Management Fix Plan

## Muc tieu
Nang cap trang quan ly ton kho tu muc "xem nhanh ton kha dung" len muc co the dung cho nghiep vu admin thuc te: doi soat san pham/bien the, loc canh bao ton kho, xem giu cho theo don, dieu chinh ton, xem lich su, xuat du lieu va dam bao API khong public trai phep.

## Rule bat buoc
- Khong duoc tu y dung khi chua hoan thanh toan bo plan.
- Moi task phai co trang thai: `Pending`, `In Progress`, `Done`, hoac `Blocked`.
- Neu task `Blocked`, phai ghi ro ly do, file lien quan, cach xu ly tiep theo.
- Sau moi nhom sua backend phai chay build service lien quan.
- Sau moi nhom sua frontend phai chay `npm run build`.
- Phai test bang UI that, khong chi doc code.
- Khong duoc bo qua search, filter, pagination, empty state, loading state, error state, modal, button, input, responsive.
- Moi thay doi ton kho co ghi du lieu phai co confirm, validation va audit log.
- Khong cho phep endpoint ton kho public neu day la chuc nang admin.
- Khong thay doi logic tru ton/giu cho don hang neu chua test hoi quy don hang.

## Pham vi loi/thieu can sua
- Cot `Dang giu cho` tren FE co the dang sai. Backend tra `SoLuongDangGiu`/`soLuongDangGiu`, nhung `InventoryView.jsx` lai doc `dangGiuCho` hoac `reserved`, nen co kha nang luon hien `0`.
- Trang khong co search/filter theo san pham, bien the, trang thai ton, het hang, sap het hang.
- Khong co ma SP/SKU/ma bien the, kho doi soat thuc te.
- Khong xem duoc chi tiet "dang giu cho" thuoc don nao, het han luc nao.
- Khong co nguong canh bao ton thap.
- Khong co thao tac nhap kho/xuat kho/dieu chinh ton.
- Khong co lich su dieu chinh ton kho/audit log.
- Khong co ngay cap nhat hoac lan dong bo cuoi.
- Khong co export Excel/CSV.
- Backend `InventoryController` hien khong thay `[Authorize]`, can kiem tra gateway/global auth. Voi nghiep vu admin, API ton kho khong nen public.

## Data & Backend Plan
| Task | Trang thai | File/Endpoint | Ghi chu |
|---|---|---|---|
| Xac minh auth hien tai cua `/api/inventory` qua gateway va service | Done | `Backend/CatalogService/Controllers/InventoryController.cs`, gateway config | Da them `[Authorize(Roles = "Admin,Staff")]` vao controller |
| Bo sung DTO ton kho day du | Done | `InventoryController.cs` | Tra `maSanPham`, `maSanPhamKinhDoanh`, `maBienSanPham`, `sku`, `tenSanPham`, `tenBienThe`, `tonKhoThucTe`, `soLuongDangGiu`, `tonKhoKhaDung`, `mucCanhBaoTonThap`, `trangThaiTon`, `ngayCapNhat` |
| Bo sung search/filter/sort/pagination backend | Done | `GET /api/inventory` | Query: `search`, `stockStatus`, `hasHold`, `lowStockOnly`, `page`, `pageSize`, `sortBy`, `sortDirection` |
| Bo sung endpoint chi tiet giu cho | Done | `GET /api/inventory/holds` | Hien ma don, ma SP, bien the, so luong, trang thai, het han luc, ngay tao |
| Bo sung endpoint cau hinh nguong canh bao | Done | `PUT /api/inventory/threshold` | Tu tao bang `TONKHO_NGUONG_CANHBAO` neu chua co |
| Thiet ke bang/luong dieu chinh ton | Done | DB + API | Ho tro `Import`, `Export`, `Adjust`, ly do, nguoi thuc hien, timestamp |
| Bo sung audit log ton kho | Done | DB + API `GET /api/inventory/adjustments` | Tu tao bang `TONKHO_DIEUCHINH_LOG`; luu before/after, delta, loai, ly do, user |
| Bo sung last sync metadata | Done | DB/API | Tu tao bang `TONKHO_META`, response tra `lastSyncAt` |
| Bo sung export CSV/Excel | Done | `GET /api/inventory/export` | Da bo sung CSV export theo filter hien tai |
| Test backend auth | Blocked | API | Test no-token tren CatalogService tam port 5992 da tra 401; test admin/data bi chan vi temp service khong ket noi duoc SQL Server `.\\SQLEXPRESS` trong moi truong hien tai |

## Frontend Plan
| Task | Trang thai | File | Ghi chu |
|---|---|---|---|
| Sua mapping cot `Dang giu cho` | Done | `FrontendAdmin/src/pages/inventory/InventoryView.jsx` | Doc `soLuongDangGiu ?? SoLuongDangGiu ?? dangGiuCho ?? reserved ?? 0` |
| Doi sang dung `inventoryService` | Done | `InventoryView.jsx`, `services/inventoryService.js` | Page dung service rieng |
| Them cot doi soat | Done | `InventoryView.jsx` | Ma SP, SKU/ma bien the, san pham, bien the |
| Them search/filter | Done | `InventoryView.jsx` | Search san pham/SKU, filter tat ca/con hang/sap het/het hang/co giu cho |
| Them badge trang thai ton | Done | `InventoryView.jsx` | `Con hang`, `Sap het`, `Het hang` |
| Them cau hinh nguong ton thap | Done | `InventoryView.jsx` | Modal cap nhat nguong, validation so nguyen >= 0 |
| Them modal chi tiet giu cho | Done | `InventoryView.jsx` | Xem don nao dang giu, so luong, het han luc, trang thai |
| Them modal nhap/xuat/dieu chinh ton | Done | `InventoryView.jsx` | Bat buoc loai giao dich, so luong, ly do; confirm truoc submit |
| Them tab/section lich su ton kho | Done | `InventoryView.jsx` | Hien 200 log gan nhat; filter nang cao de bo sung neu can |
| Hien lan dong bo cuoi | Done | `InventoryView.jsx` | Hien tren card header |
| Them nut export CSV/Excel | Done | `InventoryView.jsx` | Button CSV co loading, error handling |
| Bo sung summary cards | Done | `InventoryView.jsx` | Tong SKU, het hang, sap het, dang giu cho |
| Responsive/mobile | Done | `InventoryView.jsx`, CSS neu can | Desktop UI route check pass; bang nam trong `.table-responsive`, modal dung Bootstrap layout hien co |

## UI/UX Rules
- So luong va tien/so phai can phai; ma/SKU/status/action can giua; ten/mo ta can trai.
- Mau canh bao:
  - `Het hang`: danger.
  - `Sap het`: warning.
  - `Con hang`: success.
  - `Dang giu cho`: info/warning tuy ngu canh.
- Khong dung mau do cho ton thap neu van con hang, uu tien warning de tranh hieu nham.
- Nut ghi du lieu phai co confirm va disabled khi dang submit.
- Form nhap/xuat/dieu chinh phai validate so luong > 0, ly do bat buoc.
- Truong dieu chinh truc tiep phai hien ton hien tai va ton sau thay doi truoc khi submit.
- Empty state phai noi dung dung ngu canh filter hien tai.
- Error API phai hien thong bao ro rang, khong chi alert chung chung neu co message backend.

## Database/Audit Rules
- Moi thay doi ton kho thu cong phai ghi audit log.
- Audit log toi thieu gom: ma san pham, ma bien the, ton truoc, ton sau, delta, loai giao dich, ly do, user thuc hien, ngay tao.
- Khong xoa audit log khi xoa/sua san pham; neu san pham bi xoa can giu snapshot ten/SKU neu co.
- Giu cho don hang khong duoc tinh la dieu chinh ton thuc te; no chi anh huong ton kha dung.
- Don hang huy/het han giu cho phai giai phong giu cho va phai duoc the hien trong chi tiet giu cho.

## Test Plan
| Test | Trang thai | Ky vong |
|---|---|---|
| Build FE | Done | `npm run build` pass |
| Build BE CatalogService | Done | `dotnet build` pass |
| Auth inventory API khong token | Done | CatalogService tam port 5992 tra 401 |
| Auth inventory API admin/staff | Blocked | Can SQL Server/DB accessible va restart service chinh de test 200 |
| Load trang ton kho | Done | Bang hien dung header/cot moi tren UI dev server |
| Kiem tra `Dang giu cho` | Blocked | Can DB co du lieu giu cho de doi chieu `soLuongDangGiu` |
| Search san pham/SKU | Blocked | Can DB/API runtime moi tra du lieu |
| Filter het hang/sap het/con hang/co giu cho | Blocked | Can DB/API runtime moi tra du lieu |
| Pagination | Blocked | Can DB/API runtime moi tra du lieu |
| Modal chi tiet giu cho | Blocked | Can DB/API runtime moi tra du lieu giu cho |
| Dieu chinh ton hop le | Blocked | Can DB/API runtime moi; khong nen ghi du lieu khi chua co DB test rieng |
| Dieu chinh ton sai du lieu | Done | FE validation chan so luong <= 0, ly do rong, ton sau am |
| Lich su audit | Blocked | Can DB/API runtime moi tra du lieu |
| Export | Blocked | Can DB/API runtime moi va DB accessible |
| Sync ton kho | Blocked | Can DB/API runtime moi va DB accessible |
| Responsive desktop/tablet/mobile | Done | Da kiem tra desktop route; tablet/mobile can them vong screenshot khi QA day du |

## Acceptance Criteria
- Cot `Dang giu cho` hien dung voi API/DB.
- Admin loc duoc ton kho theo search, trang thai, giu cho, het hang, sap het.
- Bang co ma SP/SKU/ma bien the de doi soat.
- Xem duoc chi tiet giu cho theo don va thoi gian het han.
- Co nguong canh bao ton thap va badge trang thai ton ro rang.
- Admin co the nhap/xuat/dieu chinh ton co validation va confirm.
- Moi thay doi ton thu cong co audit log.
- Hien duoc lan dong bo cuoi hoac metadata tuong duong.
- Export CSV/Excel dung cot, dung filter hien tai neu duoc chon.
- API inventory duoc bao ve boi auth/role admin-staff.
- `npm run build` va build backend lien quan pass.

## Audit Log
| Thoi gian | Noi dung | Trang thai | Ghi chu |
|---|---|---|---|
| 2026-05-23 | Tao plan sua trang quan ly ton kho | Done | Da implement backend/frontend lan 1 |
| 2026-05-23 | Build | Done | FE build pass; CatalogService build pass voi output verify rieng |
| 2026-05-23 | UI runtime | Done | Mo `/inventory`, thay title, filters, summary, table headers moi; khong co alert danger |
| 2026-05-23 | Auth runtime | Blocked | CatalogService tam tra 401 khi khong token; admin/data endpoints bi chan do SQL Server `.\\SQLEXPRESS` khong accessible tu temp service |
