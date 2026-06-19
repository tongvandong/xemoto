# Giải thích VPS — Cách hệ thống được đưa lên mạng & tự cập nhật

> Tài liệu giải thích dễ hiểu: hệ thống MoToSale/XeMoto được đưa lên máy chủ chạy thật như thế nào. Mỗi phần trình bày theo 3 ý ngắn: **nó là gì → để làm gì → ở dự án mình**, kèm ví dụ đời thường cho dễ nói thành lời khi trình bày.

## 0. Mấy từ nền tảng (đọc trước cho dễ)

- **VPS** = một **máy tính thuê ngoài**, chạy 24/7 trên Internet, có địa chỉ riêng. Mình cài mọi thứ lên đó để ai cũng truy cập được (thay vì chạy trên máy cá nhân).
- **Máy chủ (server)** = phần mềm/máy đứng ra **phục vụ** yêu cầu từ người dùng.
- **Triển khai (deploy)** = đưa code đã viết lên máy chủ cho nó chạy thật.

## 1. Bức tranh tổng thể (nhìn 1 lần là hiểu)

**Hình dung như một tòa nhà:** khách đi vào qua **bảo vệ cửa chính** (nginx), bảo vệ chỉ khách tới đúng quầy (trang bán hàng hay trang quản trị). Khi cần lấy dữ liệu, các quầy gọi xuống **tổng đài** (gateway), tổng đài nối tới đúng **phòng nghiệp vụ** (auth/api), phòng nghiệp vụ lấy hồ sơ từ **kho lưu trữ** (database). Kho đặt sâu bên trong, khách không vào trực tiếp được.

```
Người dùng (trình duyệt)
        │  truy cập qua HTTPS (443)
        ▼
   nginx  =  "bảo vệ cửa chính"        → gắn khóa HTTPS + chỉ đường theo tên miền
   ├── xemoto.xyz        → trang bán hàng (store, cổng 8081)
   └── admin.xemoto.xyz  → trang quản trị (admin, cổng 8080)
        │
        ▼  (hai trang gọi /api để lấy dữ liệu)
   gateway = "tổng đài 1 số"  (cổng 5100)
   ├── /api/auth/* → phòng đăng nhập (auth, 5101)
   └── /api/*      → phòng nghiệp vụ (api, 5102)
        │
        ▼
   database (mssql)  =  "kho lưu trữ"   → đặt sâu bên trong, KHÔNG cho truy cập từ ngoài
```

**Ý chính:** 6 phần chạy chung trong một "khu nội bộ"; chỉ **bảo vệ cửa chính** (nginx) là tiếp xúc với Internet.

## 2. Đóng gói ứng dụng bằng Docker

**Docker là gì:** công cụ **đóng gói** một ứng dụng cùng mọi thứ nó cần (bản chạy, thư viện, cấu hình) vào một "hộp" khép kín.
**Để làm gì:** hộp chạy ở đâu cũng giống nhau → hết cảnh *"máy em chạy được mà lên server lại lỗi"*.

Hai từ hay nhầm, phân biệt bằng ví dụ **làm bánh**:
- **Image (ảnh đóng gói)** = **cái khuôn bánh** — làm sẵn một lần, đúc ra bao nhiêu cái cũng giống nhau. *Ở dự án:* lệnh `docker compose build` tạo "khuôn" cho từng phần.
- **Container** = **cái bánh đúc ra từ khuôn** đang chạy. Bánh hỏng thì đúc lại từ khuôn, không ảnh hưởng cái bếp (máy chủ). *Ở dự án:* `docker compose up -d` tạo 6 container; `docker compose ps` xem chúng còn chạy không.
- **Dockerfile** = **công thức làm khuôn**. Ở đây dùng kiểu "2 bước": bước đầu mang đủ đồ nghề để biên dịch code, bước sau chỉ giữ lại thành phẩm → khuôn gọn nhẹ, không kèm đồ nghề thừa. *Ở dự án:* phần backend biên dịch rồi đóng gói; phần giao diện (admin/store) dựng ra các trang tĩnh rồi cho một web server nhỏ phục vụ.

## 3. Docker Compose — sắp xếp và bật cả cụm cùng lúc

**Là gì:** một file mô tả **toàn bộ các hộp + cách chúng phối hợp** (`docker-compose.yml`).
**Để làm gì:** thay vì bật từng hộp một, chỉ cần 1 lệnh là dựng cả cụm; sửa cấu hình ở 1 nơi.
**Ở dự án:** khai báo 6 phần `mssql, auth, api, gateway, admin, store`. Vài cơ chế nên hiểu:

- **Gọi nhau bằng TÊN, không cần địa chỉ số:** các hộp ở chung "khu nội bộ" và gọi nhau bằng tên, **giống gọi số nội bộ trong công ty**. *Ở dự án:* chuỗi kết nối database ghi là `Server=mssql` — chữ `mssql` chính là tên của hộp database.
- **Cổng nào mở ra ngoài:** khai báo cổng = "mở cửa ra đường lớn"; không khai báo = "cửa chỉ đi trong nhà". *Ở dự án:* chỉ mở `gateway, admin, store`; còn **database, auth, api giấu bên trong** → không ai từ Internet đụng tới được.
- **Chờ đúng thứ tự (depends_on + healthcheck):** "kho" (database) phải **sáng đèn sẵn sàng** thì "phòng nghiệp vụ" (api) mới mở. *Ở dự án:* database tự kiểm tra mỗi 10 giây bằng một câu truy vấn thử; api chỉ khởi động khi database đã sẵn sàng → tránh lỗi kết nối lúc mới bật.
- **Tự bật lại khi chết (restart):** hộp nào lỗi thì tự khởi động lại.
- **Cấu hình & mật khẩu để riêng:** thông tin nhạy cảm (mật khẩu DB, khóa đăng nhập) không viết trong code mà để ở file `.env` rồi "rót" vào lúc chạy; viết một lần, dùng cho nhiều hộp.

## 4. Dữ liệu không mất khi cập nhật (volume) & database tự cập nhật cấu trúc

- **Volume là gì:** một **"ổ cứng cắm ngoài"** do Docker quản lý, tách rời khỏi hộp. *Để làm gì:* đập hộp cũ đi dựng hộp mới (khi deploy) thì **dữ liệu vẫn còn** vì nó nằm ở ổ ngoài. *Ở dự án:* `mssql-data` giữ database, `api-uploads` giữ ảnh sản phẩm.
  - ⚠️ **Tuyệt đối không** chạy lệnh xóa kèm `-v` (`docker compose down -v`) — nó **rút luôn ổ cứng ngoài** = mất sạch database + ảnh.
- **Tự cập nhật cấu trúc bảng (migration):** khi mình sửa code (vd thêm cột, bỏ bảng), lúc khởi động ứng dụng **tự đổi cấu trúc database** cho khớp, **không phải vào sửa bảng bằng tay**, và **không mất dữ liệu cũ**. *Ở dự án:* mỗi lần phần `api` khởi động, nó tự chạy bước cập nhật này.

## 5. Bảo vệ cửa chính (nginx) + khóa an toàn (HTTPS)

- **nginx là gì:** phần mềm đứng **ngay cửa**, nhận mọi yêu cầu rồi **chỉ đúng nơi** cần đến (gọi là *reverse proxy* — "người gác cổng chỉ đường"). *Để làm gì:* một cửa duy nhất phục vụ nhiều tên miền, giấu cấu trúc bên trong, gắn khóa an toàn ở một chỗ. *Ở dự án:* `xemoto.xyz` → trang bán hàng, `admin.xemoto.xyz` → trang quản trị.
- **HTTPS là gì:** kết nối **được khóa/mã hóa** (biểu tượng ổ khóa trên trình duyệt) để người ngoài không đọc trộm hay giả mạo được. *Cơ chế:* nginx giữ "giấy phép khóa" (chứng chỉ) và **mở khóa ngay tại cửa**, bên trong nói chuyện thường vì đã là khu an toàn. *Ở dự án:* dùng **Certbot** — một công cụ **tự đi xin và tự gia hạn** giấy phép khóa miễn phí, khỏi làm tay.

## 6. Một yêu cầu chạy qua hệ thống thế nào (kèm 2 khái niệm: tổng đài & thẻ ra vào)

- **Gateway = "tổng đài một số":** mọi yêu cầu lấy dữ liệu đều gọi vào **một số duy nhất**, tổng đài tự nối tới đúng phòng. *Để làm gì:* giao diện chỉ cần nhớ một địa chỉ; chỗ này còn gom được việc kiểm soát chung.
- **JWT = "thẻ ra vào có đóng dấu":** đăng nhập xong server phát cho một **tấm thẻ có dấu niêm phong**; mỗi lần gọi chỉ cần **chìa thẻ** ra, server kiểm dấu là biết bạn là ai, **không cần nhớ phiên đăng nhập** của từng người.

Đi một vòng cho dễ kể:
1. Mở `https://admin.xemoto.xyz` → trỏ về máy chủ (VPS).
2. Bảo vệ (nginx) thấy đúng tên miền → đưa vào **trang quản trị**.
3. Trang quản trị cần dữ liệu → gọi **tổng đài (gateway)**. Tổng đài nối: việc đăng nhập → phòng `auth` (phát **thẻ JWT**); việc còn lại → phòng `api`.
4. Mỗi yêu cầu **kèm thẻ JWT**; phòng `api` kiểm dấu thẻ rồi vào **kho (database)** lấy dữ liệu.
5. Kết quả trả ngược về cho người dùng.

## 7. Tự động cập nhật mỗi khi đẩy code (auto-deploy)

**Vấn đề:** mỗi lần sửa code, nếu phải tự tay đăng nhập server gõ lệnh dựng lại thì mất công và dễ sai.

**Cách giải quyết — có "người trực sẵn" ngay trên server:**
- **GitHub Actions** = dịch vụ **tự động chạy việc** mỗi khi có sự kiện (ở đây: có người đẩy code mới). Việc cần làm được viết sẵn trong file `deploy.yml`.
- **Self-hosted runner** = **"người trực" do mình cài đặt ngay trên VPS**, luôn chờ lệnh từ GitHub. Vì người này ở sẵn trong nhà nên **tự dựng lại app được**; và họ **chủ động gọi ra GitHub** nên không phải mở thêm cửa cho người ngoài vào.

**Khi đẩy code lên nhánh chính (`git push` lên `main`)**, "người trực" tự làm 4 việc:
```bash
git fetch origin              # lấy code mới về
git reset --hard origin/main  # ép code trên server GIỐNG HỆT bản mới nhất
docker compose build          # dựng lại "khuôn" từ code mới
docker compose up -d          # thay hộp cũ bằng hộp mới
```
Giải thích 2 điểm hay bị hỏi:
- **Vì sao "ép giống hệt" (`reset --hard`)?** Để code trên server **đúng y bản vừa đẩy**, không bị lẫn bản nháp cũ → chạy lại bao nhiêu lần kết quả vẫn như nhau, đỡ rối.
- **Vì sao dựng khuôn trước rồi mới thay hộp?** Nếu dựng lỗi thì dừng lại, **hộp cũ vẫn đang chạy → web không sập**. Dựng xong mới đổi sang hộp mới, gần như không gián đoạn.

**Một câu để nhớ:** *đẩy code lên → người trực trên server tự kéo về, dựng lại, thay mới.*

## 8. Giữ bí mật (file .env)

**Là gì:** `.env` là file chứa **thông tin nhạy cảm thật** (mật khẩu database, khóa đăng nhập...).
**Để làm gì:** không viết mật khẩu vào code → đẩy code lên mạng cũng không lộ.
**Ở dự án:** file `.env` **chỉ nằm trên VPS, không đưa lên git**; lúc chạy mới được "rót" vào các hộp. Thiếu mật khẩu là hệ thống **báo lỗi ngay** chứ không chạy với mật khẩu rỗng (an toàn hơn).

---

## Tóm tắt một mạch (đọc to khi ôn)

Code được **đóng gói thành các hộp** (Docker), một file mô tả giúp **bật cả cụm 6 hộp** cùng lúc và cho chúng gọi nhau bằng tên trong khu nội bộ. **Bảo vệ cửa chính (nginx)** gắn **khóa HTTPS** và chỉ khách tới đúng trang; muốn lấy dữ liệu thì gọi qua **tổng đài (gateway)** và chìa **thẻ đăng nhập (JWT)**. Dữ liệu nằm ở **ổ cứng ngoài (volume)** nên cập nhật app không mất dữ liệu, và database **tự đổi cấu trúc theo code**. Cuối cùng, **"người trực" trên server (runner)** khiến mỗi lần đẩy code lên là hệ thống **tự dựng lại và chạy bản mới**.

## Phụ lục — Thông tin hạ tầng (tra nhanh)

- VPS: `160.187.229.220` (Ubuntu 24.04). Code đặt tại thư mục `/opt/xemoto`.
- Trang bán hàng: `https://xemoto.xyz` · Trang quản trị: `https://admin.xemoto.xyz`.
- Kho code (deploy): `https://github.com/tongvandong/xemoto`, nhánh `main`.
- 6 phần (service): `mssql, auth, api, gateway, admin, store`. Cổng nội bộ: admin 8080, store 8081, gateway 5100. Ra ngoài chỉ mở 80/443 (web) và 22 (đăng nhập server).
- Tài liệu kèm theo: `DEPLOY_VPS_NGINX_GUIDE.md` (cài lần đầu), `REDEPLOY_AFTER_CODE_CHANGE.md` (cập nhật lại), `SETUP_AUTO_DEPLOY.md` (dựng người trực tự deploy).
