# Plan: Replace frontend-store with Copy Frontend UI

## Muc tieu

Thay toan bo giao dien user FE hien tai o `frontend-store` bang UI cuoi trong `Copy/Frontend`, dong thoi bo sung cac tinh nang ma `frontend-store` chua co, nhung van phai chay voi backend ngoai v2 tai `backend` qua API Gateway `http://localhost:5100`.

## Ket luan sau khi doc source

- `Copy/Frontend` dang hop voi backend trong `Copy/Backend`, API Gateway port `5000`.
- `frontend-store` dang hop voi backend ngoai v2, API Gateway port `5100`.
- Khong duoc copy de nguyen API layer cua `Copy/Frontend` vi se goi sai port va sai contract o auth, cart, order, payment, voucher, content.
- Huong dung: de UI/assets/page/component cua `Copy/Frontend` len `frontend-store`, sau do chinh API adapter de noi dung backend ngoai v2.

## Pham vi thay the

### Lay tu `Copy/Frontend`

- `src/App.jsx`
- `src/index.css`
- `src/assets/**`
- `src/components/**`
- `src/pages/**`
- `src/hooks/**`
- `src/utils/**`, nhung can review cac helper lien quan API/data shape
- `src/services/httpClient.js`
- `src/services/normalizers.js`
- `src/services/api.js`, nhung phai sua contract theo BE ngoai v2
- `reference/**` neu van can dung lam tai lieu mapping
- `package.json` dependency moi, dac biet `swiper`

### Giu lai tu `frontend-store`

- `Dockerfile`
- `nginx.conf`
- `.dockerignore`
- deploy/build conventions cua v2
- proxy Docker toi `gateway:5100`

### Khong lay tu `Copy/Frontend`

- `node_modules`
- `dist`
- `*.log`
- `vite.config.js.backup`
- `vite.config.js.timestamp-*.mjs`

## Viec can lam tren frontend

### 1. Backup va thay UI

- Tao backup `frontend-store` truoc khi thay.
- Replace source UI bang `Copy/Frontend/src`.
- Dam bao cac page moi duoc route trong `App.jsx`:
  - `/contact`
  - `/faq`
  - `/forgot-password`
  - `/checkout/payment`
- Giu cac route cu can thiet tu `frontend-store` neu Copy thieu:
  - `/he-thong-cua-hang`
  - `/tra-gop`

### 2. Cap nhat dependency va config

- Them `swiper` vao `frontend-store/package.json`.
- Sua `vite.config.js`:
  - dev port: `5174`
  - proxy `/api` -> `http://localhost:5100`
  - proxy `/uploads` -> `http://localhost:5100`
  - `strictPort` nen giu `true` neu muon on dinh port dev.
- Sua `.env.example`:
  - `VITE_API_BASE_URL=http://localhost:5100/api`

### 3. Chinh API adapter theo backend ngoai v2

Giu UI Copy, nhung service phai match backend ngoai v2.

#### Auth

BE ngoai v2:

- `POST /api/auth/login`
- `POST /api/auth/register`
- payload login dung `email`, `password`
- payload register dung `fullName`, `email`, `phoneNumber`, `password`

Can sua tu contract Copy:

- khong dung `matKhau`
- khong dung `hoTen`
- khong dung `soDienThoai`

#### Forgot password

UI Copy co `ForgotPasswordPage`.

Can kiem tra va bo sung backend vi BE ngoai v2 hien chua thay:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Neu chua them backend thi UI phai hien thong bao phu hop thay vi loi 404.

#### Products

BE ngoai v2 co:

- `GET /api/products`
- `GET /api/products/{id}`
- `GET /api/products/filters`
- reviews storefront:
  - `GET /api/products/{productId}/reviews`
  - `GET /api/products/{productId}/reviews/summary`
  - `GET /api/reviews/product/{productId}/me`
  - `POST /api/products/{productId}/reviews`
  - `PATCH /api/products/{productId}/reviews/me`

Can map query theo BE ngoai v2:

- `categoryId` -> `CategoryId`
- `brandId` -> `BrandId`
- `carModelId` -> `VehicleModelId`
- `compatibleCarModelId` -> `CompatibleVehicleModelId`
- `productType` -> `Kind`

#### Cart

BE ngoai v2:

- `GET /api/cart`
- `POST /api/cart/items`
- `PUT /api/cart/items/{id}`
- `DELETE /api/cart/items/{id}`

Payload:

- add item: `{ skuId, qty }`
- update item: `{ qty }`

Khong dung payload Copy dang theo tieng Viet:

- `maSanPham`
- `maBienSanPham`
- `soLuong`

#### Orders

BE ngoai v2:

- `GET /api/orders/mine`
- `GET /api/orders/{id}`
- `POST /api/orders`
- `POST /api/orders/{id}/cancel`
- `POST /api/orders/{id}/payment-claim`

Can sua:

- list order cua user phai goi `/orders/mine`, khong goi `/orders`.
- cancel dung `POST`, payload `{ reason }`.
- checkout payload dung contract BE ngoai v2:
  - `shippingRecipient`
  - `shippingPhone`
  - `shippingEmail`
  - `shippingAddress`
  - `receivingMethod`
  - `orderType`
  - `shippingFee`
  - `depositAmount`
  - `note`
  - `fulfillmentNote`
  - `pickupAppointmentAt`
  - `paymentMethod`
  - `voucherCode`

#### Payment

UI Copy co `PaymentPage` va flow QR.

BE ngoai v2 dang co:

- `POST /api/orders/{id}/payment-claim`
- `GET /api/showrooms`
- `GET /api/payments/order/{orderId}` co the bi gioi han quyen

Can lam mot trong hai cach:

1. Map UI QR sang `showrooms` de lay thong tin ngan hang, sau do dung `payment-claim` khi khach bao da chuyen khoan.
2. Bo sung backend endpoint tuong duong `GET /api/orders/{id}/payment-info` neu muon giu dung flow Copy.

Khuyen nghi: cach 1 de it dung backend hon.

#### Vouchers

BE ngoai v2:

- `GET /api/vouchers/available`
- `POST /api/vouchers/validate`

UI Copy co cac ham:

- `/vouchers/active`
- `/vouchers/applicable`
- `/vouchers/save`
- `/vouchers/my`
- `/vouchers/my/count`

Can map/fallback:

- danh sach public -> `/vouchers/available`
- validate -> `/vouchers/validate`
- save/my/applicable neu BE ngoai v2 thieu thi luu localStorage hoac tra empty list co thong bao hop ly.

#### Content

BE ngoai v2:

- `GET /api/content/faq`
- `POST /api/content/contacts`
- `GET /api/content/home-banners`
- `GET /api/content/posts/public`

UI Copy dang dung:

- `/content/faqs`
- `/content/contact-requests`

Can sua thanh endpoint BE ngoai v2.

#### Stores va installment

BE ngoai v2 co:

- `GET /api/showrooms`
- `POST /api/installment-applications`

Can giu/merge lai cac page tu `frontend-store` neu Copy khong co:

- `StoreSystemPage`
- `InstallmentPage`
- `storeService.js`

## Viec can lam tren backend

### Bat buoc neu muon chay du tinh nang Copy

- Them forgot/reset password vao `backend/src/MoToSale.AuthService` neu muon route `/forgot-password` hoat dong day du:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`

### Tuy chon

- Them `GET /api/orders/{id}/payment-info` neu muon giu nguyen `PaymentPage` cua Copy.
- Hoac khong them endpoint nay, thay vao do sua FE dung `GET /api/showrooms` + `POST /api/orders/{id}/payment-claim`.

## Thu tu trien khai de giam rui ro

1. Backup `frontend-store`.
2. Copy UI/assets/pages/components tu `Copy/Frontend`.
3. Giu lai Docker/nginx/deploy config cua `frontend-store`.
4. Sua `vite.config.js`, `.env.example`, `package.json`.
5. Sua API adapter theo contract BE ngoai v2.
6. Merge lai cac tinh nang ngoai v2 dang co ma Copy khong co:
   - store system
   - installment
   - showrooms service
7. Build frontend.
8. Chay BE ngoai v2 va test runtime.
9. Neu test ra endpoint thieu, bo sung backend theo danh sach tren.

## Checklist test

### Frontend build

- `npm install`
- `npm run build`

### Backend

- API Gateway ngoai v2 chay port `5100`.
- Auth service chay port `5101`.
- API service chay port `5102`.

### Luong test UI

- Home load banner/product.
- Product list filter/sort/search.
- Product detail load images/reviews/related.
- Register.
- Login.
- Forgot password neu da them backend.
- Cart add/update/remove.
- Checkout full payment.
- Checkout deposit/installment neu UI co.
- Payment QR / payment claim.
- Orders page goi `/orders/mine`.
- Order detail.
- Favorites.
- Voucher validate.
- Contact submit.
- FAQ load.
- Store system load `/showrooms`.
- Installment submit.

## Rui ro can chu y

- Copy UI co the goi cac ham API khong ton tai trong adapter sau khi merge.
- Text tieng Viet trong mot so file hien bi mojibake; neu sua file nen giu encoding UTF-8.
- `ForgotPasswordPage` la tinh nang UI co san nhung backend ngoai v2 co the thieu.
- Payment flow cua Copy va BE ngoai v2 khac nhau; can test ky sau checkout.
- Khong duoc commit `node_modules`, `dist`, log, `.vs`, `bin`, `obj`.

## Definition of Done

- `frontend-store` hien thi UI cuoi cua `Copy/Frontend`.
- Build frontend thanh cong.
- Dev proxy va Docker nginx deu tro toi gateway `5100`.
- Cac flow user chinh chay duoc voi backend ngoai v2.
- Tinh nang moi tu Copy duoc them hoac co fallback ro rang neu can backend bo sung.

## Completion Status - 2026-06-11

Status: COMPLETE.

Da hoan thanh:

- Da backup frontend cu tai `frontend-store.backup-20260611-101437`.
- Da thay `frontend-store` bang UI user tu `Copy/Frontend`, giu lai Docker/nginx/deploy config can thiet.
- Da cau hinh dev proxy va `.env.example` tro ve gateway ngoai v2 `http://localhost:5100/api`.
- Da map API adapter cua FE theo BE ngoai v2: auth, products, cart, orders, payment claim, vouchers, content, showrooms, installment.
- Da bo sung/merge cac route va tinh nang thieu: contact, FAQ, forgot password, checkout payment, he thong cua hang, tra gop.
- Da bo sung backend forgot/reset password trong `MoToSale.AuthService`.
- Da sua mapping gia san pham BE ngoai v2 (`listPrice`, `stockTotal`) de UI khong hien 0 VND sai.
- Da lam sach mojibake/kytu loi trong UI source va kiem tra `BAD_COUNT=0`.

Da verify:

- `npm install` thanh cong.
- `npm run build` thanh cong.
- `dotnet build` thanh cong cho AuthService, APIService, ApiGateway.
- `dotnet test tests/MoToSale.Backend.Tests/MoToSale.Backend.Tests.csproj --no-restore` thanh cong, 20 passed.
- Runtime API qua gateway pass: health, products, filters, content/faq, showrooms, vouchers, register, login, forgot/reset password, cart, checkout order, orders mine, payment claim, contact, installment.
- Browser check tren `http://127.0.0.1:5174`: home, products, FAQ, checkout redirect login, he-thong-cua-hang, tra-gop deu render, khong loi backend, khong mojibake.

Con lai sau khi hoan thanh:

- `npm audit` van bao 5 vulnerabilities tu dependency tree hien co.
- Vite build van canh bao chunk JS > 500 kB; khong chan release, co the toi uu code-splitting sau.
