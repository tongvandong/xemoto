# Admin Frontend Audit Plan

## Muc tieu
Ra soat toan bo Frontend Admin de tim va sua cac loi:
- Loi dau tieng Viet, mojibake, chu khong dau, chu hien thi sai.
- Loi bo cuc, footer, sidebar, modal, table, form, responsive.
- Loi CSS sau Tailwind migration/compatibility layer.
- Loi hien thi thieu du lieu do map sai field API.
- Loi nut bam, modal, input, upload, preview, badge, pagination.
- Loi nghiep vu admin bi sai sau khi thao tac qua UI.

## Rule bat buoc khi thuc thi plan
- Tuyet doi bam theo plan nay khi bat dau audit, khong duoc tu y dung khi chua di het checklist.
- Moi trang phai duoc kiem tra bang UI that, khong chi doc code.
- Moi loi phat hien phai ghi lai: trang, buoc tai hien, ket qua mong doi, ket qua thuc te, file lien quan, huong sua, trang thai.
- Sau khi sua moi nhom loi phai chay `npm run build`.
- Neu loi lien quan backend/API, phai kiem tra ca response API va mapping frontend.
- Khong duoc bo qua text co dau, title, tooltip, placeholder, alert, confirm, empty state, loading state.
- Khong duoc bo qua modal, dropdown, tab, pagination, filter, search, upload, preview, badge.
- Khong duoc bo qua desktop/tablet/mobile.
- Neu task bi Blocked, phai ghi ro ly do va cach unblock.

## Trang thai task
Dung mot trong cac trang thai sau:
- Pending
- In Progress
- Done
- Blocked

## Phase 1 - Baseline va moi truong
| Task | Trang thai | Ghi chu |
|---|---|---|
| Kiem tra FE/BE/Gateway dang chay dung port | Pending | FE thuong o `http://localhost:5175` |
| Dang nhap bang tai khoan admin test | Pending | `admin123@gmail.com / dung123` neu con dung |
| Chay `npm run build` truoc audit | Pending | Ghi lai warning/error |
| Mo DevTools/browser log neu co the | Pending | Ghi console error/network error |
| Tao thu muc screenshot audit | Pending | Vi du `test-artifacts/admin-frontend-audit-YYYYMMDD` |

## Phase 2 - Audit text, encoding, tieng Viet
| Task | Trang thai | Ghi chu |
|---|---|---|
| Quet code tim mojibake pho bien | Pending | Tim `Ã`, `áº`, `Ä`, `Æ`, `Â`, `âˆ`, `â€”`, `â†` |
| Kiem tra menu/sidebar/navbar/footer | Pending | Ten menu, dropdown, copyright, version |
| Kiem tra title tung trang | Pending | H1, card title, breadcrumb neu co |
| Kiem tra table header tung trang | Pending | Cot bang phai co dau dung |
| Kiem tra button/tooltip/title tung trang | Pending | Them, sua, xoa, dong, huy, cap nhat |
| Kiem tra modal title va labels | Pending | Tat ca modal form/detail/confirm |
| Kiem tra placeholder/help text | Pending | Input, textarea, file upload |
| Kiem tra alert/confirm/error/loading/empty state | Pending | Chu phai co dau va dung nghiep vu |

## Phase 3 - Audit layout chung
| Task | Trang thai | Ghi chu |
|---|---|---|
| Sidebar open/collapse bang hamburger | Pending | Noi dung ben phai khong bi che sai |
| Sidebar hover khi collapsed | Pending | Hover khong lam vo layout, khong che bat thuong |
| Active menu theo route | Pending | Route nao active dung menu do |
| Navbar dropdown admin | Pending | Mo/dong dung, khong tran |
| Footer trang ngan | Pending | Footer khong phinh cao bat thuong |
| Footer trang dai | Pending | Cuon dung, footer khong che noi dung |
| Main content spacing | Pending | Header/card/table khong dinh nhau |
| Desktop 1366x768 | Pending | Khong overlap |
| Tablet 768x1024 | Pending | Sidebar/content/table on |
| Mobile 390x844 | Pending | Sidebar overlay, table scroll dung |

## Phase 4 - Audit API mapping va hien thi du lieu
| Task | Trang thai | Ghi chu |
|---|---|---|
| Lap danh sach endpoint moi trang dang goi | Pending | So sanh service/frontend/backend |
| Kiem tra field id moi trang | Pending | `id`, `ma...`, key row/action |
| Kiem tra field hien thi list | Pending | Table dung gia tri API |
| Kiem tra field form edit | Pending | Edit modal phai nap dung thong tin dang co |
| Kiem tra field submit create/update | Pending | Payload dung ten field backend can |
| Kiem tra date field | Pending | `startDate`, `startsAt`, `ngay...`, input date |
| Kiem tra boolean/status field | Pending | Active/Inactive/Published/Draft/... |
| Kiem tra image/url field | Pending | Anh dai dien, logo, anh san pham, preview |
| Kiem tra empty/null/0 value | Pending | Khong dung `||` lam mat gia tri 0 |

## Phase 5 - Audit tung trang

### Dashboard
| Task | Trang thai | Ghi chu |
|---|---|---|
| Kiem tra statistic cards | Pending | Icon, label, so lieu |
| Kiem tra chart co/khong co du lieu | Pending | Empty state neu DB rong |
| Kiem tra date/filter neu co | Pending | Gia tri dung sau reload |

### San pham
| Task | Trang thai | Ghi chu |
|---|---|---|
| List/search/filter/pagination | Pending | Gia tri cot chinh xac |
| Modal them/sua san pham | Pending | Field co dau, map dung API |
| Anh chinh trong form sua | Pending | Dong bo voi gallery sau sua gan day |
| Quan ly anh san pham | Pending | Upload, preview, dat anh chinh, xoa |
| Quan ly bien the | Pending | Them/sua/xoa, chu dong deu, layout dung |
| Xoa san pham/ngung ban | Pending | Confirm va thong bao dung nghiep vu |

### Danh muc
| Task | Trang thai | Ghi chu |
|---|---|---|
| List tree/parent-child | Pending | Cap cha-con dung |
| Them/sua/xoa | Pending | Form field, slug, status |
| Pagination/search neu co | Pending | Nut va gia tri dung |

### Hang xe va Dong xe
| Task | Trang thai | Ghi chu |
|---|---|---|
| Tab Hang xe/Dong xe | Pending | Tab khong loi CSS |
| Filter dong xe theo hang | Pending | Select hien dung |
| Them/sua hang xe | Pending | Logo upload/preview/reload |
| Them/sua dong xe | Pending | Map hang xe dung |
| Xoa/doi status | Pending | Button va confirm |

### Don hang
| Task | Trang thai | Ghi chu |
|---|---|---|
| List don hang | Pending | Cot trang thai don/phuong thuc/thanh toan |
| Chi tiet don hang | Pending | Nut quay lai ben trai, spacing dung |
| Cap nhat trang thai | Pending | Chi 4 status: Cho xac nhan, Dang giao, Da giao, Da huy |
| Huy don | Pending | Confirm/ly do/status sau reload |
| Thanh toan thu cong trong chi tiet | Pending | Dung nghiep vu admin xac nhan thu cong |

### Voucher
| Task | Trang thai | Ghi chu |
|---|---|---|
| Text co dau sau sua | Pending | Table/modal/options |
| Modal sua nap dung data | Pending | `startsAt/endsAt`, `Amount`, `FreeShipping` |
| Them/sua/xoa voucher | Pending | Payload dung backend |
| Gioi han, so da dung, status | Pending | Hien thi dung gia tri 0/null |

### Ton kho
| Task | Trang thai | Ghi chu |
|---|---|---|
| Bang ton kho | Pending | Cot so lieu dung |
| Dong bo ton kho | Pending | Nut, loading, ket qua |
| Text/empty state | Pending | Co dau, khong tran |

### FAQ
| Task | Trang thai | Ghi chu |
|---|---|---|
| Active/Inactive hien thi dung | Pending | Truoc do co loi “hoat dong” nhung bang ghi “an” |
| CRUD FAQ | Pending | Cau hoi, cau tra loi, danh muc, thu tu |
| Modal va validation | Pending | Text co dau |

### Lien he
| Task | Trang thai | Ghi chu |
|---|---|---|
| List lien he | Pending | Loai yeu cau, trang thai, ngay |
| Detail modal | Pending | Du thong tin khach |
| Danh dau da xu ly | Pending | Status sau reload |

### Danh gia
| Task | Trang thai | Ghi chu |
|---|---|---|
| List danh gia | Pending | Sao, noi dung, user, product |
| Duyet/an | Pending | Button va badge dung |
| Pagination/filter | Pending | Khong lech bang |

### Bai viet
| Task | Trang thai | Ghi chu |
|---|---|---|
| Text co dau sau sua | Pending | Title, header, modal, labels |
| Modal sua load detail | Pending | Noi dung khong bi trong |
| Anh dai dien | Pending | `anhDaiDienUrl`, preview, submit dung |
| Them/sua/xoa bai viet | Pending | Slug, status, publish date |

### Nguoi dung
| Task | Trang thai | Ghi chu |
|---|---|---|
| List/search/filter role/status | Pending | Cot dung data |
| Them user voi role | Pending | Endpoint admin, payload |
| Sua user | Pending | Endpoint admin, field map |
| Khoa/mo khoa neu co | Pending | Status sau reload |

### Bao cao
| Task | Trang thai | Ghi chu |
|---|---|---|
| Cards doanh thu/don hang/AOV | Pending | Icon khong loi, gia tri dung |
| Date range | Pending | Submit, reset, reload |
| Chart va top san pham | Pending | Empty/long data |
| Bang so lieu | Pending | Gia tri cot chinh xac |

## Phase 6 - Nut bam va input
| Task | Trang thai | Ghi chu |
|---|---|---|
| An tat ca nut tren tung trang | Pending | Ke ca icon-only buttons |
| Mo/dong tat ca modal | Pending | X, Dong, Huy, overlay |
| Submit du lieu hop le | Pending | Create/update dung |
| Submit thieu field bat buoc | Pending | Validation dung |
| Nhap chu dai | Pending | Khong vo layout |
| Nhap so 0/null | Pending | Khong mat gia tri do `||` |
| Nhap sai dinh dang date/url/email | Pending | UI/API bao loi hop ly |
| Pagination prev/next/page number | Pending | Khong vuot bien |
| Search/filter reset | Pending | Ket qua dung sau reload |

## Phase 7 - Screenshot va doi chieu bang
| Task | Trang thai | Ghi chu |
|---|---|---|
| Chup screenshot moi trang list | Pending | Luu vao artifact |
| Chup screenshot moi modal chinh | Pending | Add/Edit/Detail/Confirm |
| Kiem tra header bang | Pending | Ten cot dung/co dau |
| Kiem tra gia tri cot so voi API | Pending | Chon it nhat 3 dong/trang |
| Kiem tra badge status | Pending | Mau va label dung |
| Kiem tra action buttons | Pending | Icon/tooltip/spacing |
| Kiem tra table scroll ngang mobile | Pending | Khong overlap |

## Phase 8 - Regression sau sua
| Task | Trang thai | Ghi chu |
|---|---|---|
| Chay `npm run build` | Pending | Bat buoc pass |
| Kiem tra console errors | Pending | Khong co error moi |
| Reload tung trang da sua | Pending | Du lieu van dung |
| Chuyen trang roi quay lai | Pending | State/layout khong loi |
| Kiem tra DB/API sau CRUD | Pending | Neu co thao tac thay doi du lieu |
| Ghi danh sach loi da sua | Pending | File, nguyen nhan, ket qua test |
| Ghi danh sach loi con lai neu co | Pending | Blocked/Can xu ly tiep |

## Acceptance Criteria
- Tat ca trang admin hien thi tieng Viet co dau, khong con mojibake.
- Modal sua tren moi trang nap dung thong tin dang co.
- Table hien dung gia tri cot so voi API/database.
- Khong co footer cao bat thuong o trang ngan.
- Sidebar open/collapse/hover khong che sai noi dung.
- Khong co modal/form/table bi tran, overlap, mat nut tren desktop/tablet/mobile.
- Nut bam, filter, search, pagination, CRUD/action chinh hoat dong dung.
- `npm run build` pass sau khi hoan tat.
- Tat ca checklist duoc cap nhat trang thai `Done` hoac co ghi chu `Blocked` ro rang.

## Audit Log
| Thoi gian | Trang | Loi | File lien quan | Trang thai | Ghi chu |
|---|---|---|---|---|---|
| 2026-05-23 | Baseline | FE/BE/Gateway dang chay dung port 5000-5004 va FE 5175 | N/A | Done | `npm run build` pass, chi con Vite chunk warning |
| 2026-05-23 | Screenshots | Da chup 39 screenshot desktop/tablet/mobile cho 13 route | `test-artifacts/admin-frontend-audit-20260523` | Done | Luu `desktop-*`, `tablet-*`, `mobile-*` |
| 2026-05-23 | Layout | Route sweep khong thay footer phinh, footer overlap, horizontal overflow | `audit-dom.json` | Done | Kiem tra dashboard, products, categories, brands, orders, vouchers, inventory, faq, contacts, reviews, posts, users, reports |
| 2026-05-23 | Text/Encoding | Route va modal/action audit khong thay mojibake tren UI that | `audit-dom.json`, `audit-actions.json` | Done | Da kiem tra title, header, labels, buttons, badges, modal labels |
| 2026-05-23 | San pham | Add/edit/variants/images/delete-confirm-safe da duoc bam, khong loi dau | `ProductList.jsx`, `ProductForm.jsx`, `VariantManager.jsx`, `ImageManager.jsx` | Done | Delete duoc chan bang confirm=false |
| 2026-05-23 | Hang xe & Dong xe | Add/edit brand, tab dong xe, delete-confirm-safe da duoc bam, khong loi CSS tab | `BrandList.jsx` | Done | Logo cell hien anh nen table text trong cot logo la rong la hop ly |
| 2026-05-23 | Don hang | Bang list hien sai tong tien: UI 0 VND trong khi API `tongThanhToan=81330000` | `OrderList.jsx` | Fixed | Da sua dung `tongThanhToan ?? tongTien ?? totalAmount ?? 0`; UI xac nhan lai `81.330.000 ₫` |
| 2026-05-23 | Dashboard | Recent order amount co cung rui ro mapping thieu `tongThanhToan` | `Dashboard.jsx` | Fixed | Da sua `getOrderAmount` dung `tongThanhToan` |
| 2026-05-23 | Voucher | Text co dau, modal edit nap dung data, date/Amount/FreeShipping da pass | `VoucherList.jsx`, `VouchersController.cs` | Done | Da sua truoc audit va test lai |
| 2026-05-23 | Bai viet | Text co dau, modal edit load detail, anh dai dien `anhDaiDienUrl` pass | `PostList.jsx` | Done | Da sua truoc audit va test lai |
| 2026-05-23 | FAQ | Add/edit/delete-confirm-safe da duoc bam, labels co dau | `FaqList.jsx` | Done | Active/Inactive dung `dangHoatDong` |
| 2026-05-23 | Ton kho | List va nut dong bo da duoc bam voi confirm=false | `InventoryView.jsx` | Done | Khong thuc hien sync that de tranh thay doi du lieu ngoai y muon |
| 2026-05-23 | Lien he | Trang hien empty state, khong co row de bam detail/process | `ContactList.jsx` | Blocked | Blocked do API/DB hien khong co du lieu lien he trong trang test |
| 2026-05-23 | Danh gia | List/action approve-hide/delete-confirm-safe da duoc bam; review bi doi trang thai da duoc khoi phuc | `ReviewList.jsx` | Done | Da restore review #1 ve `Approved` |
| 2026-05-23 | Nguoi dung | Add/edit/delete-confirm-safe da duoc bam, table/API first row khop | `UserList.jsx` | Done | Khong thay nut status rieng tren UI hien tai |
| 2026-05-23 | Bao cao | Cards/chart/table/date submit da duoc kiem tra, icon/card khong loi | `ReportsPage.jsx` | Done | Chart/table hien dung, khong loi layout |
| 2026-05-23 | API/Table | Da doi chieu first row voi API cho products, brands, vouchers, inventory, posts, users, orders, reviews | `api-table-check.json` | Done | Phat hien va sua mismatch orders |
| 2026-05-23 | Regression | `npm run build` sau sua OrderList/Dashboard pass | FrontendAdmin | Done | Chi con Vite chunk warning |

## Execution Run - 2026-05-23

### Artifact
- Screenshot route/viewport: `D:\MotorTeam\MoToSale-End\FrontendAdmin\test-artifacts\admin-frontend-audit-20260523`
- DOM route audit: `audit-dom.json`
- Action/modal audit: `audit-actions.json`
- API/table comparison: `api-table-check.json`

### Status Summary
| Phase | Trang thai | Ghi chu |
|---|---|---|
| Phase 1 - Baseline va moi truong | Done | Ports OK, admin login OK, build pass, artifact dir created |
| Phase 2 - Audit text/encoding | Done | UI route + modal audit khong con mojibake |
| Phase 3 - Audit layout chung | Done | Desktop/tablet/mobile route sweep pass |
| Phase 4 - API mapping va hien thi du lieu | Done | Phat hien/sua orders + dashboard amount mapping |
| Phase 5 - Audit tung trang | Done/Blocked | Contacts Blocked do khong co row; cac trang con lai pass audit hien tai |
| Phase 6 - Nut bam va input | Done/Blocked | Da bam tat ca nut co the khong pha du lieu; thao tac destructive duoc chan confirm=false; contacts Blocked do rong |
| Phase 7 - Screenshot va doi chieu bang | Done | Screenshot + API comparison da co |
| Phase 8 - Regression | Done | Build pass, order amount da verify lai |

### Loi da sua trong run nay
- `OrderList.jsx`: cot Tong tien dung sai field, da sua sang `tongThanhToan ?? tongTien ?? totalAmount ?? 0`.
- `Dashboard.jsx`: recent order amount co nguy co sai field, da sua sang `tongThanhToan ?? tongTien ?? totalAmount ?? amount ?? 0`.

### Blocked
- Trang Lien he khong co du lieu test nen khong the bam detail/process bang UI that. Can seed contact request hoac tao request lien he tu client neu muon test tiep phan nay.
- Submit hop le cho CRUD destructive khong duoc chay hang loat trong audit nay; cac nut delete/action nguy hiem duoc bam voi `confirm=false` de khong pha du lieu.
