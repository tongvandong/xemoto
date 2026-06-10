# Ghi nhớ dự án — MoToSale/XeMoto (v2)

## Deployment (đã chạy thật, thành công)
Hai tài liệu deploy do chủ dự án viết & đã verify — **luôn tham chiếu khi liên quan deploy/redeploy**:
- `v2/DEPLOY_VPS_NGINX_GUIDE.md` — deploy lần đầu lên VPS Ubuntu 24.04 + Docker Compose + nginx reverse proxy + Certbot HTTPS.
- `v2/REDEPLOY_AFTER_CODE_CHANGE.md` — quy trình deploy lại sau khi sửa code.

### Hạ tầng demo
- VPS: `160.187.229.220` (Ubuntu 24.04). Source clone tại `/opt/xemoto`.
- Domain store: `https://xemoto.xyz` · Domain admin: `https://admin.xemoto.xyz`.
- **Đã chuyển sang 1 repo**: làm việc + deploy đều trên `https://github.com/tongvandong/xemoto` (branch `main`), với thư mục `v2` là **gốc repo** (có `v2/.git`). Push thẳng, KHÔNG còn subtree split.
- Repo cũ `https://github.com/Dung2212-aH/MoToSale-End` chỉ **lưu trữ (archive)**, không dùng để deploy.
- Docker services: `mssql, auth, api, gateway, admin, store`. Cổng nội bộ: admin 8080, store 8081, gateway 5100. nginx chỉ public 80/443 (+22 SSH).

### Quy trình redeploy nhanh (local → VPS)
Local (từ `D:\MotorTeam\MoToSale-End\v2`):
```
git add . ; git commit -m "..." ; git push origin main
```
VPS (`/opt/xemoto`): `git pull --ff-only ; docker compose build ; docker compose up -d ; docker compose ps`
(Bỏ qua bước VPS nếu đã bật auto-deploy.)

### Quy tắc QUAN TRỌNG (không vi phạm)
- **KHÔNG** chạy `docker compose down -v` khi redeploy — `-v` xóa volume `mssql-data` (DB) và `api-uploads` (ảnh).
- **KHÔNG** commit file `.env` (chứa MSSQL_SA_PASSWORD, JWT_SECRET_KEY thật).
- Build trước rồi mới `up -d` (build lỗi thì app cũ vẫn chạy).
- APIService tự chạy EF migration khi start → sau khi đổi schema chỉ cần build+up lại `api`; cẩn thận migration lỗi làm `api` không lên.
- Không public cổng 1433 (SQL) / 8080 / 8081 / 5100 ra ngoài sau khi nginx+HTTPS ổn.

## Phát triển local
- Source chính: `D:\MotorTeam\MoToSale-End\v2` (`backend` .NET 8, `frontend-admin`, `frontend-store` Vite/React).
- Build kiểm tra: `npm run build` (mỗi FE) · `dotnet test` (backend).
