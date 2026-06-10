# Admin Frontend Real-World Test Plan

## Muc tieu

Kiem thu FrontendAdmin theo cach nguoi quan tri su dung that:

- Kiem tra chuc nang qua nut bam, form, modal, table, filter, pagination.
- Kiem tra nghiep vu admin: quan ly san pham, danh muc, hang/dong xe, don hang, thanh toan thu cong, voucher, user, danh gia, noi dung.
- Kiem tra output sau thao tac: UI cap nhat, API thanh cong, du lieu ton tai sau reload, badge/trang thai dung.
- Kiem tra giao dien: bo cuc, responsive, text khong vo layout, modal khong tran, nut ro nghia.
- Kiem tra loi: validation, API fail, session het han, thao tac bi chan.

## Pham vi

Frontend admin: `http://127.0.0.1:5175`

API gateway: `http://localhost:5000`

Tai khoan admin mau:

```text
admin123@gmail.com / dung123
```

## Nguyen tac test

- Tao du lieu test rieng, khong sua/xoa du lieu that neu khong can.
- Prefix du lieu test bang `QA_YYYYMMDD_`.
- Moi thao tac thanh cong phai reload trang de kiem tra du lieu co persist khong.
- Moi thao tac co upload anh/logo phai reload va mo lai modal/detail de kiem tra URL anh khong phai `blob:`.
- Moi test destructive nhu xoa/huy don phai dung ban ghi test.
- Ghi lai bug voi 4 thong tin: trang, buoc lam, ket qua thuc te, ket qua mong doi.

## Checklist moi lan test

Truoc khi test:

- BE gateway chay va health OK.
- FE admin chay duoc.
- Browser khong con token cu neu test login.
- Console browser khong co error san.
- Network tab san sang quan sat `4xx/5xx`.

Sau moi flow:

- Alert/toast/modal dung ngu canh.
- Table reload hoac detail cap nhat dung.
- Badge trang thai dung mau va dung text.
- Pagination/filter/search khong bi reset vo ly.
- Reload trang van giu du lieu da cap nhat.
- Khong co React error tren console.

## Rule chup anh man hinh va doi chieu gia tri cot bang

Bat buoc chup screenshot khi test cac bang quan tri co du lieu dong: san pham, danh muc, hang/dong xe, don hang, thanh toan, voucher, user, review, ton kho, bao cao.

Quy tac:

- Chup anh toan bo bang sau khi trang load xong, khong chup khi spinner/loading con hien.
- Neu bang co scroll ngang, chup them anh sau khi keo sang phai de thay du cot action/trang thai.
- Neu test search/filter/pagination, chup anh truoc thao tac va sau thao tac.
- Neu test them/sua/xoa/cap nhat trang thai, chup anh sau khi modal dong va bang reload.
- Voi bang co nhieu trang, ghi ro page dang test va page size.
- Anh chup phai thay du header cot va it nhat dong du lieu dang verify.
- Dat ten evidence theo mau: `PAGE_CASE_STEP_EXPECTED_ACTUAL.png`, vi du `orders_ORDER-05_after_status_confirmed.png`.

Doi chieu gia tri cot:

- Moi dong test phai doi chieu cac cot hien thi voi nguon du lieu mong doi: du lieu vua nhap, detail API, hoac response list API.
- Khong chi kiem tra "co dong moi"; phai kiem tra tung cot quan trong.
- Neu UI format lai gia tien/ngay thang/status, so sanh theo gia tri nghiep vu sau format, khong so sanh chuoi API thuan tuy.
- Neu cot hien badge, kiem tra ca text va mau badge.
- Neu cot hien anh/logo, kiem tra anh load thanh cong va URL khong phai `blob:` sau reload.
- Neu cot bi an do responsive, phai chup trang thai mobile/tablet hoac scroll ngang de xac nhan khong mat du lieu.

Danh sach cot can verify toi thieu:

| Bang | Cot bat buoc doi chieu |
|---|---|
| San pham | Ma SP, ten, danh muc, hang xe, gia goc, gia KM, ton kho, trang thai |
| Danh muc | Ten, slug, danh muc cha, thu tu, trang thai |
| Hang xe | Ten hang, slug, logo, trang thai |
| Dong xe | Ten dong, hang xe, slug, trang thai |
| Don hang | Ma don, khach hang, tong tien, trang thai don, trang thai thanh toan, ngay tao |
| Thanh toan | Ma TT, ma don hang, so tien, phuong thuc, trang thai, ngay tao |
| Voucher | Ma voucher, loai, gia tri, thoi han, gioi han, da dung, trang thai |
| User | Ten/email, role, trang thai, ngay tao |
| Review | San pham, user, diem, noi dung, trang thai, ngay tao |
| Ton kho | San pham, bien the, ton kho, giu cho, kha dung |
| Bao cao | Doanh thu, so don, top san pham, date range |

Mau ghi ket qua screenshot:

| Case ID | Screenshot | Cot da doi chieu | Ket qua |
|---|---|---|---|
| ORDER-05 | `orders_ORDER-05_after_status_confirmed.png` | Ma don, trang thai don, thanh toan | Pass/Fail |

## Rule bat buoc bam het cac nut

Moi trang phai test toan bo nut bam va control co the tuong tac, khong chi test happy path chinh.

Quy tac:

- Bam tat ca nut primary/secondary/danger tren trang.
- Bam tat ca icon action trong tung dong table: xem, sua, xoa, anh, bien the, duyet, an, huy, dong bo, xac nhan.
- Bam tat ca nut trong modal: Luu/Xac nhan, Dong/Huy, nut X tren header, nut confirm danger.
- Bam cac nut filter/search/reset neu co.
- Bam pagination: trang dau, trang sau, trang truoc, trang cuoi neu UI co.
- Bam tab/segmented control/dropdown neu trang co nhieu tab nhu Hang xe/Dong xe.
- Bam nut khi form dang sai de kiem tra validation.
- Bam nut khi form dang dung de kiem tra thanh cong.
- Bam lai nut sau khi thao tac thanh cong de dam bao state da reset.
- Kiem tra nut loading/disabled trong luc request dang chay, tranh double submit.
- Kiem tra nut disabled co ly do hop ly tren UI hoac theo nghiep vu, vi du don da huy khong cho cap nhat tiep.
- Voi nut destructive, phai test ca Cancel trong confirm/modal va Confirm that.
- Neu mot nut khong bam duoc, ghi ro ly do: disabled dung nghiep vu, bi che layout, loi CSS, hoac bug event handler.

Mau ghi ket qua nut bam:

| Trang | Nut/control | State test | Expected output | Result |
|---|---|---|---|---|
| San pham | Xoa | Confirm cancel | Khong xoa dong | Pass/Fail |
| San pham | Xoa | Confirm OK | Dong bien mat hoac API chan co message | Pass/Fail |
| Don hang | Xac nhan thanh toan | Paid | Badge thanh toan doi Paid | Pass/Fail |

## Rule bat buoc thu het cac truong du lieu nhap

Moi form/modal phai test tat ca truong co the nhap hoac chon, bao gom input text, number, date, textarea, select, checkbox/toggle, file upload.

Quy tac chung:

- Test de trong truong bat buoc.
- Test nhap gia tri hop le toi thieu.
- Test nhap gia tri hop le day du.
- Test gia tri qua dai, ky tu dac biet, dau tieng Viet, khoang trang dau/cuoi.
- Test gia tri trung lap voi record da co neu field yeu cau unique, vi du email, ma SP, slug, ma voucher.
- Test submit khi chi sua mot field, cac field khac phai giu nguyen.
- Test sua lai field sau khi validation fail, loi phai mat khi hop le.
- Test dong modal va mo lai, field phai reset dung theo mode Them/Sua.
- Test reload sau khi luu de dam bao du lieu persist.

Quy tac theo loai field:

| Loai field | Gia tri can thu |
|---|---|
| Text | Rong, chi khoang trang, tieng Viet co dau, ky tu dac biet, chuoi dai, gia tri trung |
| Slug/code | Chu hoa/thuong, co dau, co khoang trang, ky tu dac biet, trung slug/code |
| Number | Rong, 0, so am, so thap phan, so rat lon, chu cai, gia tri hop le |
| Money | 0, am, gia tri nho, gia tri lon, gia khuyen mai lon hon gia goc |
| Date/date range | Rong, ngay qua khu, ngay tuong lai, ngay bat dau sau ngay ket thuc |
| Select/dropdown | Khong chon, tung option, doi option sau khi da nhap field phu thuoc |
| Checkbox/toggle | Bat/tat, reload kiem tra state |
| Textarea | Rong, nhieu dong, noi dung dai, ky tu dac biet |
| File upload | Khong chon file, file anh hop le, file sai dinh dang, file lon, doi file sau preview |
| Password | Rong, qua ngan, hop le, confirm mismatch neu co |
| Email/phone | Format sai, format dung, trung email, so dien thoai thieu/du ky tu |

Danh sach form can test field day du:

| Form | Truong bat buoc can thu |
|---|---|
| Login | Email, password |
| San pham | Ma SP, ten, slug, loai, danh muc, hang, dong, mo ta, gia goc, gia KM, ton kho, anh chinh, trang thai |
| Bien the | Ten bien the, SKU, phien ban, mau sac, gia ghi de, ton kho, trang thai |
| Anh san pham | File anh, bien the gan anh, anh chinh |
| Danh muc | Ten, slug, cha, mo ta, thu tu, trang thai |
| Hang xe | Ten hang, slug, logo, trang thai |
| Dong xe | Hang xe, ten dong, slug, trang thai |
| User | Ho ten, email, password, role, trang thai |
| Voucher | Ma, loai giam, gia tri, don toi thieu, giam toi da, ngay bat dau/ket thuc, gioi han, trang thai |
| Don hang | Trang thai don, trang thai van chuyen, ghi chu giao nhan, ly do huy |
| Thanh toan thu cong | Trang thai thanh toan |
| FAQ | Cau hoi, cau tra loi, thu tu, trang thai |
| Bai viet | Tieu de, slug, noi dung, trang thai, anh neu co |
| Lien he | Trang thai xu ly, ghi chu neu co |

Mau ghi ket qua field:

| Form | Field | Gia tri test | Expected output | Result |
|---|---|---|---|---|
| Voucher | Ma | Trung ma da co | Bao loi trung ma, khong luu | Pass/Fail |
| San pham | Gia KM | Lon hon gia goc | Bi chan hoac hien canh bao nghiep vu | Pass/Fail |
| Hang xe | Logo | Anh hop le | Preview hien va persist sau reload | Pass/Fail |

## Rule danh gia CSDL sau khi test tong the

Sau khi hoan thanh toan bo test UI, bat buoc danh gia lai CSDL de xac nhan thao tac tren UI tao ra du lieu dung, khong de lai trang thai nghiep vu sai, khong phat sinh du lieu rac ngoai du kien.

Quy tac:

- Chi truy van doc CSDL truoc, khong xoa/sua truc tiep khi chua tong hop ket qua.
- Doi chieu tat ca record test co prefix `QA_YYYYMMDD_` voi ket qua UI.
- Kiem tra cac ban ghi da xoa tren UI that su khong con trong CSDL, hoac neu la soft delete thi phai co status/dangHoatDong dung.
- Kiem tra cac quan he cha-con/foreign key khong bi orphan.
- Kiem tra cac gia tri tien, ton kho, so luong, ngay thang khong bi am/khong hop le.
- Kiem tra cac status nghiep vu cuoi cung dung voi thao tac da test.
- Kiem tra anh/logo upload co URL luu trong CSDL va file ton tai trong storage.
- Kiem tra khong co duplicate bat thuong: ma san pham, slug, email, ma voucher, SKU.
- Kiem tra audit fields neu co: ngayTao, ngayCapNhat, ngayHuy, ngayThanhToan.
- Kiem tra du lieu test co the don dep an toan sau test.

Bang/nhom du lieu can hau kiem:

| Nhom | Noi dung can kiem |
|---|---|
| Users | User test dung role/trangThai, email khong duplicate |
| Categories | Parent/child dung, slug unique, xoa/soft delete dung |
| Brands/Models | LogoUrl persist, dong xe gan dung hang, khong orphan |
| Products | TrangThaiSanPham, DangHoatDong, gia, ton kho, slug/maSP unique |
| ProductVariants | SKU unique, bien the gan dung san pham, ton kho dung |
| ProductImages | UrlAnh ton tai, LaAnhChinh chi dung anh chinh, maBienSanPham dung |
| Orders | TrangThaiDonHang, TrangThaiThanhToan, TrangThaiVanChuyen, lyDoHuyDon dung |
| InventoryHolds | Khi huy don, hold khong con Active sai nghiep vu |
| Payments | Neu khong co giao dich tu dong, khong phat sinh payment rac; thanh toan thu cong cap nhat order |
| Vouchers | GioiHanSuDung, SoLanDaDung, active/expired, ma unique |
| Reviews | TrangThai sau duyet/an dung, rating hop le |
| Content/FAQ/Contacts | Status, ngayCapNhat, noi dung sau sua dung |

Checklist SQL/API hau kiem:

| ID | Kiem tra | Expected output |
|---|---|---|
| DB-01 | Dem tat ca record prefix `QA_YYYYMMDD_` theo bang | So luong khop voi test da tao |
| DB-02 | Lay record vua sua tren UI | Gia tri cot khop screenshot va API |
| DB-03 | Lay record da xoa | Khong con record hoac soft-delete status dung |
| DB-04 | Kiem tra duplicate key nghiep vu | Khong co duplicate ngoai tru record co chu dich |
| DB-05 | Kiem tra foreign key/orphan | Khong co record con tro toi parent da mat |
| DB-06 | Kiem tra status don hang/thanh toan/ton kho | Khop flow da test |
| DB-07 | Kiem tra URL anh/logo | URL khong null khi da upload, file ton tai |
| DB-08 | Kiem tra ngay tao/cap nhat | NgayCapNhat doi sau sua, NgayTao khong bi ghi de |
| DB-09 | Don dep du lieu QA | Xoa/vo hieu hoa du lieu test theo thu tu an toan |

Mau ghi ket qua hau kiem CSDL:

| Bang | Query/API | Gia tri mong doi | Gia tri thuc te | Result |
|---|---|---|---|---|
| Products | Search `QA_20260521_PRODUCT` | 1 record Active/Inactive dung test | ... | Pass/Fail |
| Orders | Order test da huy | TrangThaiDonHang=Cancelled, TrangThaiThanhToan=Cancelled | ... | Pass/Fail |

## Du lieu test de tao

| Loai | Gia tri goi y |
|---|---|
| Danh muc cha | `QA_20260521_PARENT` |
| Danh muc con | `QA_20260521_CHILD` |
| Hang xe | `QA_20260521_BRAND` |
| Dong xe | `QA_20260521_MODEL` |
| San pham | `QA_20260521_PRODUCT` |
| Bien the | `QA_RED`, `QA_BLACK` |
| Voucher | `QA20260521` |
| FAQ | `QA FAQ question` |
| Bai viet | `QA Post title` |
| User | `qa_admin_test@example.com` |

## 1. Dang nhap, phan quyen, dieu huong

| ID | Buoc test | Expected output |
|---|---|---|
| AUTH-01 | Mo `/login`, nhap sai email/password, bam Dang nhap | Hien loi, khong vao dashboard |
| AUTH-02 | Dang nhap bang tai khoan admin mau | Dieu huong vao dashboard, token/user duoc luu |
| AUTH-03 | Reload dashboard | Van o trang admin, khong bi logout |
| AUTH-04 | Bam tung menu sidebar | URL doi dung, active menu dung |
| AUTH-05 | Bam Logout | Ve login, route admin bi chan |
| AUTH-06 | Xoa token/localStorage roi reload trang admin | Bi day ve login |

## 2. Dashboard va bao cao nhanh

| ID | Buoc test | Expected output |
|---|---|---|
| DASH-01 | Mo dashboard | Card thong ke hien so lieu hoac 0, khong crash |
| DASH-02 | Kiem tra chart doanh thu/don hang/top san pham | Chart render dung, khong bi trong khung vo nghia neu khong co data |
| DASH-03 | Bam cac link/shortcut neu co | Dieu huong dung trang lien quan |
| DASH-04 | Thu voi DB it data | UI hien empty state ro rang |

## 3. San pham

| ID | Buoc test | Expected output |
|---|---|---|
| PROD-01 | Bam Them san pham, de trong field bat buoc, bam Luu | Validation hien dung, khong tao record |
| PROD-02 | Tao san pham co danh muc, hang, gia, ton kho, trang thai Dang ban | San pham xuat hien trong bang |
| PROD-03 | Upload anh chinh trong form san pham, bam Luu | Preview hien, sau reload anh van con, URL khong phai `blob:` |
| PROD-04 | Sua ten/gia/trang thai sang Ngung ban | Bang va modal edit hien gia tri moi |
| PROD-05 | Search theo ma/ten san pham | Chi hien ket qua phu hop |
| PROD-06 | Filter theo danh muc/hang/trang thai | Ket qua dung filter |
| PROD-07 | Tao bien the mau/sku/ton kho | Bien the luu va hien trong modal quan ly bien the |
| PROD-08 | Sua/xoa bien the test | Danh sach bien the cap nhat dung |
| PROD-09 | Upload anh chung va anh theo bien the | Anh hien dung nhom, reload van con |
| PROD-10 | Dat anh chinh tu modal anh | Badge anh chinh doi dung |
| PROD-11 | Xoa anh test | Anh bien mat sau reload |
| PROD-12 | Xoa san pham test chua co don hang | San pham bien mat khoi bang/detail 404 |
| PROD-13 | Xoa san pham da co lich su don hang | Bi chan va thong bao nen dung Ngung ban |

## 4. Danh muc

| ID | Buoc test | Expected output |
|---|---|---|
| CAT-01 | Tao danh muc cha | Hien trong table/dropdown |
| CAT-02 | Tao danh muc con gan cha | Hien quan he cha-con dung |
| CAT-03 | Sua ten/slug/thu tu/trang thai | Reload van giu gia tri moi |
| CAT-04 | Search/filter danh muc | Ket qua dung |
| CAT-05 | Xoa danh muc con test | Bien mat khoi bang |
| CAT-06 | Xoa danh muc cha con con | Neu backend chan, UI hien loi ro; neu cho xoa, con phai duoc xu ly dung |

## 5. Hang xe va dong xe

| ID | Buoc test | Expected output |
|---|---|---|
| BRAND-01 | Tao hang xe co logo | Hang hien trong bang, logo persist sau reload |
| BRAND-02 | Sua ten/slug/logo/trang thai hang | UI va API cap nhat dung |
| BRAND-03 | Tao dong xe gan hang vua tao | Dong xe hien trong tab Dong xe |
| BRAND-04 | Filter dong xe theo hang | Chi hien dong xe cua hang da chon |
| BRAND-05 | Sua/xoa dong xe test | Bang reload dung |
| BRAND-06 | Xoa hang co dong xe/san pham lien quan | Neu bi chan thi thong bao ro ly do |

## 6. Don hang

| ID | Buoc test | Expected output |
|---|---|---|
| ORDER-01 | Mo danh sach don hang | Cac cot ma don, khach, tien, trang thai don, thanh toan hien dung |
| ORDER-02 | Filter trang thai don | Ket qua dung |
| ORDER-03 | Mo chi tiet don hang | Thong tin khach, san pham, tong tien, ghi chu hien dung |
| ORDER-04 | Bam Quay lai | Quay ve danh sach, nut nam ben trai header |
| ORDER-05 | Cap nhat trang thai don sang Confirmed/Processing/Shipping | Badge trang thai don doi dung sau reload |
| ORDER-06 | Cap nhat trang thai van chuyen thu cong | Gia tri van chuyen/ghi chu giao nhan luu dung neu UI co field |
| ORDER-07 | Huy don co ly do | Don sang Cancelled, thanh toan hien Cancelled, ly do luu dung |
| ORDER-08 | Thu cap nhat don da Cancelled/Delivered | Nut bi disable hoac API chan ro rang |

## 7. Thanh toan thu cong

Ghi chu nghiep vu: he thong admin khong phu thuoc giao dich tu dong. Admin xac nhan thanh toan thu cong trong chi tiet don hang.

| ID | Buoc test | Expected output |
|---|---|---|
| PAY-01 | Mo danh sach don co `Unpaid` | Cot thanh toan hien `Chua thanh toan`, khong hien text raw |
| PAY-02 | Vao chi tiet don, bam Xac nhan thanh toan | Mo modal cap nhat thanh toan thu cong |
| PAY-03 | Chon `Paid`, bam Xac nhan | Don hien `Da thanh toan` sau reload |
| PAY-04 | Chon `PartiallyPaid` | Don hien `Thanh toan mot phan` |
| PAY-05 | Huy don sau khi chua thanh toan | Cot thanh toan hien `Da huy`, khong con `Unpaid` |
| PAY-06 | Mo trang Thanh toan | Hien thong bao khong co giao dich tu dong, khong co nut xu ly giao dich |

## 8. Voucher

| ID | Buoc test | Expected output |
|---|---|---|
| VOU-01 | Tao voucher percent | Voucher hien trong table, field dung |
| VOU-02 | Tao voucher amount | Gia tri hien dung tien te |
| VOU-03 | Tao trung ma voucher | Bi chan, hien loi ro |
| VOU-04 | Sua thoi han/gioi han/trang thai | Reload van dung |
| VOU-05 | Filter/search voucher | Ket qua dung |
| VOU-06 | Xoa voucher test | Voucher bien mat khoi table |
| VOU-07 | Voucher het han/inactive | Badge trang thai dung |

## 9. User

| ID | Buoc test | Expected output |
|---|---|---|
| USER-01 | Tao user moi voi role Customer/Staff/Admin | User hien dung role vua chon |
| USER-02 | Validation email/password/required fields | Loi hien ngay, khong tao sai |
| USER-03 | Sua thong tin user khac | Bang reload va detail/modal dung |
| USER-04 | Doi role/trang thai user | Badge role/trang thai cap nhat |
| USER-05 | Khoa user | User khong dang nhap duoc neu test bang account do |
| USER-06 | Xoa user test neu UI ho tro | Record bien mat hoac bi chan co thong bao |

## 10. Danh gia

| ID | Buoc test | Expected output |
|---|---|---|
| REV-01 | Mo danh sach review | Sao, noi dung, user, san pham hien dung |
| REV-02 | Filter theo trang thai/rating | Ket qua dung |
| REV-03 | Duyet review | Badge sang Approved, reload van dung |
| REV-04 | An/tu choi review | Badge sang Rejected/Hidden theo quy uoc backend |
| REV-05 | Xem review co anh | Anh load duoc, fallback neu loi anh |

## 11. Bai viet, FAQ, lien he

| ID | Buoc test | Expected output |
|---|---|---|
| POST-01 | Tao bai viet | Hien trong table |
| POST-02 | Sua title/content/status | Reload van dung |
| POST-03 | Xoa bai viet test | Bien mat khoi bang |
| FAQ-01 | Tao FAQ | Hien cau hoi/cau tra loi |
| FAQ-02 | Sua/xoa FAQ | Table cap nhat dung |
| CONTACT-01 | Mo lien he | Danh sach hien du lieu |
| CONTACT-02 | Danh dau da xu ly | Badge/status doi dung |

## 12. Ton kho va bao cao

| ID | Buoc test | Expected output |
|---|---|---|
| INV-01 | Mo ton kho | Danh sach ton kho load dung |
| INV-02 | Bam dong bo ton kho | Hien loading, sau do table refresh |
| INV-03 | Filter/search ton kho | Ket qua dung |
| REP-01 | Mo bao cao | Chart va bang load khong crash |
| REP-02 | Doi date range | So lieu/chart cap nhat |
| REP-03 | DB rong | Empty state ro rang, khong crash |

## 13. Giao dien va nut bam

| ID | Buoc test | Expected output |
|---|---|---|
| UI-01 | Test desktop 1366x768 | Sidebar/header/table khong tran |
| UI-02 | Test tablet/mobile neu co | Table scroll ngang hop ly, modal khong mat footer |
| UI-03 | Mo modal dai | Body scroll duoc, nut Dong/Luu van thay |
| UI-04 | Text dai trong ten san pham/voucher/user | Khong vo layout |
| UI-05 | Double click nut Luu/Xac nhan | Khong tao duplicate neu dang loading |
| UI-06 | Tat modal bang X/backdrop | State reset dung khi mo lai |
| UI-07 | Nut nguy hiem Xoa/Huy | Co confirm/modal ly do ro rang |
| UI-08 | Icon/action button | Tooltip/title ro nghia |

## 14. Loi va bao mat

| ID | Buoc test | Expected output |
|---|---|---|
| ERR-01 | Tat BE roi thao tac list | Hien loi tai du lieu, khong crash app |
| ERR-02 | API tra 401 | Bi logout/yeu cau dang nhap lai |
| ERR-03 | API tra 403 | Hien khong co quyen |
| ERR-04 | API tra 400 validation | Hien message gan ngu canh form |
| ERR-05 | Upload file khong phai anh | Bi chan hoac API loi ro |
| SEC-01 | Dang nhap user khong phai Admin/Staff | Khong vao duoc admin |
| SEC-02 | Truy cap truc tiep URL admin khi chua login | Bi chuyen ve login |

## 15. Regression sau moi dot sua

Chay nhanh cac flow sau:

1. Login admin.
2. Tao/sua/xoa category test.
3. Tao/sua logo brand test, reload.
4. Tao/sua/xoa product test, upload anh, reload.
5. Mo don hang detail, cap nhat trang thai don.
6. Xac nhan thanh toan thu cong.
7. Huy don test/chua thanh toan va kiem tra badge thanh toan.
8. Tao/sua/xoa voucher test.
9. Duyet/an review test neu co data.
10. Logout.

## Mau ghi ket qua

| ID | Result | Evidence | Bug/Note |
|---|---|---|---|
| AUTH-01 | Pass/Fail | Screenshot/API status | Mo ta ngan |

## Tieu chi hoan thanh

- 100% test critical pass: login, product CRUD, order status, manual payment, voucher CRUD.
- Khong co console error moi.
- Khong co API 500 trong flow happy path.
- Du lieu upload anh/logo persist sau reload.
- Cac nut nguy hiem co confirm va khong thao tac nham du lieu that.
