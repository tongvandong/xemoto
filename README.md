# MoToSale v2 — Hệ thống quản lý cửa hàng xe máy & phụ tùng

Hệ thống quản trị (admin) cho cửa hàng kinh doanh xe máy & phụ tùng: bán hàng online + tại quầy (POS), kho 1 cửa hàng, hậu mãi (đổi trả/bảo hành/sửa chữa), cung ứng, tài chính và báo cáo.

> Tài liệu chi tiết trong thư mục [`../docs`](../docs): Yêu cầu (`V2_SRS_REQUIREMENTS.md`), Thiết kế (`V2_DESIGN.md`), Triển khai (`V2_DEPLOYMENT_GUIDE.md`), Hướng dẫn trang admin (`V2_ADMIN_PAGES_GUIDE.md`), Báo cáo kiểm thử (`V2_BTL_FULL_SYSTEM_TEST_REPORT_20260604.md`).

## Công nghệ
- **Backend**: .NET 8, ASP.NET Core, EF Core (code-first), SQL Server LocalDB. Kiến trúc microservices sau API Gateway (Ocelot).
- **Frontend**: React 18 + Vite + Tailwind (AdminLTE/Bootstrap), axios + JWT.

## Cấu trúc thư mục
```
v2/
├─ backend/
│  ├─ src/
│  │  ├─ MoToSale.Common/        # BaseEntity, enums, JWT, hashing
│  │  ├─ MoToSale.Entities/      # thực thể domain (bảng)
│  │  ├─ MoToSale.DTO/           # request/response DTO
│  │  ├─ MoToSale.Repository/    # AppDbContext, Repository<T>, Migrations, Seeds
│  │  ├─ MoToSale.Services/      # logic nghiệp vụ
│  │  ├─ MoToSale.AuthService/   # :5101  đăng nhập, JWT, tài khoản
│  │  ├─ MoToSale.APIService/    # :5102  toàn bộ nghiệp vụ + tự migrate/seed
│  │  └─ MoToSale.ApiGateway/    # :5100  Ocelot reverse-proxy (điểm vào)
│  └─ tests/MoToSale.Backend.Tests/
└─ frontend-admin/               # SPA React (Vite dev :5176)
```

## Cổng dịch vụ
| Thành phần | URL |
|---|---|
| API Gateway (điểm vào duy nhất) | http://localhost:5100 |
| AuthService | http://localhost:5101 |
| APIService | http://localhost:5102 |
| Frontend admin (dev) | http://localhost:5176 (proxy `/api` → 5100) |

## Yêu cầu môi trường
- **.NET SDK 8.0+**
- **Node.js ≥ 20.19** (Vite 8) + npm
- **SQL Server LocalDB** (`(localdb)\MSSQLLocalDB`) — kèm Visual Studio hoặc "SQL Server Express LocalDB"

## Chạy bằng Docker (khuyến nghị — không cần cài .NET/Node/SQL Server)

Chỉ cần **Docker Desktop**. Tại thư mục `v2`:
```bash
cp .env.example .env
# Sửa MSSQL_SA_PASSWORD và JWT_SECRET_KEY trong .env trước khi chạy trên VPS.
docker compose up --build
```
Lệnh này dựng & chạy cả hệ: SQL Server + AuthService + APIService + ApiGateway + 2 frontend (nginx). Lần đầu sẽ tải image (~vài phút). APIService tự migrate + seed khi DB sẵn sàng.

| Truy cập | URL |
|---|---|
| Storefront (khách) | http://localhost:8081 |
| Admin (quản trị) | http://localhost:8080 |
| API Gateway | http://localhost:5100 |
| SQL Server | Chỉ mở trong Docker network, không public ra ngoài VPS |

Dừng: `docker compose down` · Xóa luôn dữ liệu DB và ảnh upload: `docker compose down -v`.

Ghi chú deploy VPS cơ bản:
- File `.env` chứa mật khẩu SQL/JWT thật và đã bị `.gitignore` chặn, không commit file này.
- SQL Server không publish port `1433`; backend truy cập DB qua mạng nội bộ Docker.
- Ảnh upload được lưu trong volume `api-uploads`, không mất khi recreate container.
- Khi public ra internet, nên đặt nginx/caddy phía ngoài để gắn domain và HTTPS cho admin/store.

---

## Chạy nhanh (không Docker — Windows / PowerShell)

**1) Backend** — mở 3 cửa sổ, chạy theo thứ tự (APIService sẽ tự tạo DB + seed lần đầu, ~30–60s):
```powershell
cd v2\backend
dotnet build
dotnet run --project src\MoToSale.AuthService    # :5101
dotnet run --project src\MoToSale.APIService     # :5102  (tự migrate + seed)
dotnet run --project src\MoToSale.ApiGateway     # :5100
```

**2) Frontend**:
```powershell
cd v2\frontend-admin
npm install
npm run dev        # mở http://localhost:5176
```

**3) Đăng nhập** (tài khoản seed):
| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị (Admin) | `admin@motosale.local` | `Admin@123` |
| Nhân viên (Staff) | `staff@motosale.local` | `Staff@123` |

## Kiểm thử
```powershell
cd v2\backend ; dotnet test           # 20/20 PASS
cd v2\frontend-admin ; npm run build  # build production
```

Chi tiết cài đặt, EF migrations, deploy production, cấu hình, xử lý sự cố → xem **`docs/V2_DEPLOYMENT_GUIDE.md`**.
