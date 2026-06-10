# Admin UI Test Plan

## Muc tieu

Test toan bo chuc nang FrontendAdmin theo kieu black-box qua UI:

- Login/logout va protected routes.
- CRUD cac trang quan tri.
- Filter, search, pagination.
- Modal va form validation.
- Cac nut action: them, sua, xoa, duyet, an, xac nhan, huy, cap nhat trang thai, dong bo.
- Kiem tra output sau moi thao tac: table reload, badge trang thai, modal dong/mo, alert loi, du lieu chi tiet.

## Chuan bi

Tai khoan admin mau:

```text
admin123@gmail.com / dung123
```

Dieu kien truoc khi test:

- Backend gateway chay tai `http://localhost:5000`.
- Frontend admin chay tai `http://127.0.0.1:5175`.
- Browser dang o trang admin va co the login.
- Voi thao tac destructive nhu xoa/huy, uu tien tao du lieu test moi roi thao tac tren du lieu do.

## Quy uoc du lieu test

Dung prefix de tim va don dep:

```text
AUTO_TEST_CATEGORY_
AUTO_TEST_BRAND_
AUTO_TEST_MODEL_
AUTO_TEST_USER_
AUTO_TEST_FAQ_
AUTO_TEST_POST_
AUTO_TEST_VOUCHER_
```

Voi don hang va thanh toan, uu tien dung ban ghi test hoac chi thao tac khi co the hoan tac.

## Checklist output chung

Sau moi click/nut bam can kiem:

- Modal, toast, alert hien dung ngu canh.
- Form validation chan du lieu sai.
- Request thanh cong thi modal dong va bang reload.
- Du lieu moi/sua hien dung tren UI.
- Badge trang thai, role, gia tien, ngay thang format dung.
- Console browser khong co error React/API moi.
- Network/API khong tra `400/401/403/404/500` ngoai cac test id gia co chu dich.

## Thu tu test khuyen nghi

1. Login va Dashboard.
2. Cac trang doc du lieu it rui ro: Dashboard, Reports, Inventory, Contacts.
3. CRUD du lieu doc lap: FAQ, Posts, Categories, Brands/Models, Vouchers.
4. User admin CRUD.
5. Reviews action.
6. Orders va Payments action.
7. Products, variants va images sau cung vi nhieu surface nhat.

## Test cases theo trang

| Trang | Nut/Flow can bam | Output can kiem tra | Ket qua |
|---|---|---|---|
| Login | Dang nhap sai, dang nhap dung | Sai bao loi, dung vao Dashboard, luu user/token | Pass |
| Logout | Bam dang xuat | Quay ve login, route admin bi chan | Pass |
| Dashboard | Bam cac link Chi tiet | Dieu huong dung trang, so lieu/chart khong crash | Pass |
| San pham | Them, sua, xem chi tiet, xoa, search/filter, pagination | San pham xuat hien/cap nhat/an khoi bang | Partial |
| Product Form | Luu thieu field, them bien the, upload anh | Validation hoat dong, anh preview/upload, variant luu dung | Partial |
| Danh muc | Them parent, them child, sua, xoa | Cay cha-con dung, filter/search dung | Fail |
| Hang xe & Dong xe | Tab Hang, tab Dong, them/sua/xoa, filter dong theo hang | Danh sach reload dung, dropdown hang dung | Pass |
| Don hang | Filter trang thai/loai, mo chi tiet | Bang dung du lieu, detail `/orders/:id` load du | Pass |
| Chi tiet don hang | Cap nhat trang thai, huy don | Badge trang thai doi, modal dong, ly do huy hien neu co | Pass |
| Thanh toan | Filter, xac nhan thanh toan, huy thanh toan | Badge doi `Paid/Cancelled`, khong loi API | Partial |
| Voucher | Them/sua/xoa voucher, validation ngay/gia tri | Voucher moi hien trong bang, format tien/phan tram dung | Fail |
| Ton kho | Bam Dong bo ton kho | Bang reload, so ton/giu cho/kha dung dung format | Pass |
| Nguoi dung | Them user kem role, sua user, khoa/mo, xoa | Role badge dung, status doi, user moi hien trong bang | Pass |
| Danh gia | Duyet, an, xoa, filter status/rating | Badge doi Approved/Hidden, item xoa khoi bang | Partial |
| Bai viet | Them/sua/xoa, doi trang thai Draft/Published | Bai viet reload dung, slug/status dung | Pass |
| FAQ | Them/sua/xoa, bat/tat trang thai | Status hoat dong/an dung | Pass |
| Lien he | Xem chi tiet, danh dau da xu ly | Badge doi Processed, detail dung noi dung | Pass |
| Bao cao | Doi date range, xem chart/table | Chart khong crash, so lieu doi theo range | Pass |

## Tieu chi pass

Mot trang duoc tinh pass khi:

- Load khong alert loi.
- Tat ca nut chinh bam duoc.
- CRUD/action phan anh ngay tren UI.
- Refresh trang van giu du lieu dung.
- Khong co console error moi.
- Khong co API 5xx.

## Mau ghi ket qua

```text
Trang:
Flow:
Input:
Expected:
Actual:
API/Console:
Ket qua: Pass/Fail
Ghi chu:
```
