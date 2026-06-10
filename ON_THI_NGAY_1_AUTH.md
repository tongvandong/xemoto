# Đề cương ôn thi Ngày 1 - Backend, Frontend Admin và luồng đăng nhập

## I. Mục tiêu trong ngày

Bạn phụ trách **Backend và Frontend Admin**, nên Ngày 1 tập trung vào cách admin app khởi động, đăng nhập, lưu token, phân quyền, gọi backend và backend xử lý login.

Sau khi học xong Ngày 1, cần trả lời được:

- Project MoToSale v2 gồm những phần nào?
- Phần bạn phụ trách trong project là gì?
- Frontend Admin đăng nhập như thế nào?
- Token JWT được lưu ở đâu và gửi lên backend ra sao?
- `ProtectedRoute` bảo vệ route admin như thế nào?
- Frontend gọi backend qua API Gateway như thế nào?
- Backend nhận login, kiểm tra user, kiểm tra mật khẩu và tạo JWT như thế nào?
- Nếu xoá một đoạn code nhỏ trong luồng đăng nhập, có thể viết lại được không?

## II. Tổng quan project

MoToSale v2 là hệ thống bán và quản lý xe máy/phụ tùng.

Project có 3 phần chính, nhưng phạm vi bạn cần nắm sâu là `backend` và `frontend-admin`:

| Phần | Thư mục | Vai trò |
|---|---|---|
| Backend | `backend` | Phần bạn phụ trách: API, AuthService, APIService, Controller, Service, Repository, DTO, Entity, DbContext |
| Frontend Admin | `frontend-admin` | Phần bạn phụ trách: trang quản trị cho Admin/Staff |
| Frontend Store | `frontend-store` | Trang khách hàng mua sản phẩm. Chỉ cần biết vai trò tổng quát |

Trong Ngày 1 chỉ tập trung vào:

```text
frontend-admin
-> API Gateway
-> AuthService backend
-> Repository/DbContext
-> SQL Server
```

## III. Các file cần nắm

### 1. Frontend Admin

| File | Vai trò |
|---|---|
| `frontend-admin/src/App.jsx` | Khai báo route, bọc app bằng `AuthProvider`, dùng `ProtectedRoute` |
| `frontend-admin/src/pages/Login.jsx` | Giao diện đăng nhập, gọi hàm `login` |
| `frontend-admin/src/contexts/AuthContext.jsx` | Quản lý trạng thái đăng nhập, user, token, role |
| `frontend-admin/src/components/ProtectedRoute.jsx` | Chặn route nếu chưa đăng nhập hoặc sai quyền |
| `frontend-admin/src/components/Navbar.jsx` | Hiển thị user, xử lý logout |
| `frontend-admin/src/services/api.js` | Axios instance, tự gắn JWT token, xử lý lỗi 401 |
| `frontend-admin/src/services/authService.js` | Gọi API đăng nhập |
| `frontend-admin/src/components/MainLayout.jsx` | Layout chính sau khi đăng nhập |
| `frontend-admin/src/components/Sidebar.jsx` | Menu điều hướng admin |

### 2. Backend

| File | Vai trò |
|---|---|
| `backend/src/MoToSale.ApiGateway/ocelot.json` | Cấu hình API Gateway route `/api/auth/*` |
| `backend/src/MoToSale.AuthService/Controllers/AuthController.cs` | Nhận request login/register |
| `backend/src/MoToSale.Services/Identity/AuthService.cs` | Xử lý đăng nhập, kiểm tra mật khẩu, tạo JWT |
| `backend/src/MoToSale.Services/Identity/IAuthService.cs` | Interface cho AuthService |
| `backend/src/MoToSale.DTO/Auth/AuthDtos.cs` | DTO login/register/response |

## IV. Luồng đăng nhập Admin cần thuộc

Đây là luồng quan trọng nhất của Ngày 1:

```text
Login.jsx
-> handleSubmit()
-> login(email, password) trong AuthContext
-> authService.login(email, password)
-> api.post('/auth/login', { email, password })
-> request thật: /api/auth/login
-> API Gateway localhost:5100
-> Ocelot chuyển request xuống AuthService localhost:5101
-> AuthController.Login(LoginRequest request)
-> AuthService.LoginAsync(request)
-> UserRepository.GetByEmailWithRolesAsync(email)
-> PasswordHasher.Verify(password, user.PasswordHash)
-> TokenHelper.CreateToken(...)
-> trả AuthResponse { token, expiresAt, user }
-> AuthContext lưu admin_token và admin_user vào localStorage
-> setUser(authUser)
-> Login.jsx navigate('/')
-> ProtectedRoute cho vào Dashboard
```

Điểm cần nhấn khi trả lời giảng viên:

```text
Em phụ trách Backend và Frontend Admin, nên em nắm rõ cả hai phía.
Ở frontend admin, em nắm Login.jsx, AuthContext, api.js, ProtectedRoute và service gọi API.
Ở backend, em nắm request đi qua Gateway xuống AuthController, AuthService, repository để kiểm tra tài khoản và tạo JWT.
```

## V. Phân tích từng file

### 1. `Login.jsx` - Trang đăng nhập Admin

Chức năng:

- Hiển thị form đăng nhập.
- Lưu state form:
  - `email`
  - `password`
  - `error`
  - `loading`
- Khi submit thì gọi `login(email, password)` từ `AuthContext`.
- Nếu thành công thì chuyển về `/`.
- Nếu thất bại thì hiện thông báo lỗi.

Đoạn quan trọng:

```jsx
const result = await login(email, password);

if (result.success) {
  navigate('/');
} else {
  setError(result.message);
}
```

Cần hiểu khi bị hỏi:

- `Login.jsx` không tự gọi axios.
- Nó chỉ gọi `login()` do `AuthContext` cung cấp.
- Việc gọi API, lưu token, lưu user nằm trong `AuthContext`.
- Đây là trang public, chưa cần `ProtectedRoute`.

### 2. `AuthContext.jsx` - Bộ nhớ đăng nhập của Admin

Chức năng trong admin:

- Là nơi quản lý trạng thái đăng nhập toàn bộ frontend-admin.
- Cung cấp hook `useAuth()`.
- Lưu và đọc thông tin đăng nhập từ `localStorage`.

Các state chính:

```jsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
```

Khi app vừa load:

```text
Đọc admin_user từ localStorage.
Đọc admin_token từ localStorage.
Nếu có cả hai và user có role Admin/Staff thì setUser.
Nếu role không hợp lệ thì xoá localStorage.
Cuối cùng setLoading(false).
```

Hàm `login` làm gì trong admin:

```text
1. Gọi authService.login(email, password).
2. Nhận data từ backend.
3. Lấy data.token và data.user.
4. Kiểm tra user có role Admin hoặc Staff không.
5. Lưu token vào localStorage với key admin_token.
6. Lưu user vào localStorage với key admin_user.
7. setUser(authUser).
8. Trả về { success: true }.
```

Hàm `logout` làm gì:

```text
1. Xoá admin_token.
2. Xoá admin_user.
3. setUser(null).
```

Các hàm phân quyền:

```jsx
const isAdmin = () => {
  return getUserRoles(user).includes('Admin');
};

const hasRole = (...roles) => {
  const userRoles = getUserRoles(user);
  return roles.some((role) => userRoles.includes(role));
};
```

### 3. `api.js` - Cổng gọi API của Frontend Admin

Chức năng trong admin:

- Tạo axios instance dùng chung cho các service admin như `productService`, `orderService`, `voucherService`.
- Base URL là `/api`.
- Tự động gắn JWT token vào mọi request.
- Nếu backend trả `401` thì xoá token/user và chuyển về `/login`.

Đoạn tạo axios:

```js
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

Đoạn tự gắn token:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Ý nghĩa:

```text
Nếu localStorage có admin_token,
mọi request sẽ có header:

Authorization: Bearer <token>
```

Đoạn xử lý `401`:

```text
Nếu API trả 401 và không phải request login,
frontend xoá admin_token, xoá admin_user,
rồi chuyển người dùng về /login.
```

### 4. `authService.js` - Service gọi API đăng nhập

Chức năng:

- Gom các API liên quan đến auth.

Code chính:

```js
const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/users/me'),
};
```

Cần hiểu:

```text
api.post('/auth/login')
không gọi thẳng /auth/login.

Vì api.js có baseURL = '/api',
nên request thật là:

/api/auth/login
```

### 5. `ProtectedRoute.jsx` - Bảo vệ các trang Admin

Chức năng:

- Bảo vệ route admin.
- Nếu chưa đăng nhập thì không cho vào.
- Nếu không đủ role thì báo không có quyền.

Logic cần thuộc:

```text
Nếu loading -> hiện spinner.
Nếu chưa đăng nhập -> Navigate('/login').
Nếu role không hợp lệ -> hiện thông báo không có quyền.
Nếu hợp lệ -> render children.
```

Route admin mặc định cho phép:

```jsx
roles = ['Admin', 'Staff']
```

Route chỉ Admin:

```jsx
<ProtectedRoute roles={['Admin']}>
```

Ví dụ trong `App.jsx`:

```jsx
<Route
  path="/users"
  element={
    <ProtectedRoute roles={['Admin']}>
      <MainLayout><UserList /></MainLayout>
    </ProtectedRoute>
  }
/>
```

### 6. `Navbar.jsx` - Thanh trên của Admin

Chức năng:

- Hiển thị tên người dùng.
- Mở menu profile.
- Logout.

Tên hiển thị được lấy từ:

```jsx
user?.fullName || user?.hoTen || user?.name
```

Logout:

```jsx
logout();
navigate('/login');
```

### 7. `App.jsx` - Khai báo route Admin

Chức năng:

- Bọc app bằng `AuthProvider`.
- Khai báo route `/login`.
- Bọc các route quản trị bằng `ProtectedRoute`.
- Một số route chỉ Admin được vào, ví dụ `/users`, `/audit-logs`, `/finance`, `/operational-imports`.

Ví dụ:

```jsx
<Route
  path="/users"
  element={
    <ProtectedRoute roles={['Admin']}>
      <MainLayout><UserList /></MainLayout>
    </ProtectedRoute>
  }
/>
```

Cần hiểu:

```text
Route admin = ProtectedRoute + MainLayout + Page.
```

Ví dụ:

```text
/orders
-> ProtectedRoute
-> MainLayout
-> OrderList
```

## VI. Backend Auth cần nắm

Vì bạn phụ trách cả backend, phần này cần nắm sâu hơn mức chỉ giải thích luồng:

```text
Frontend Admin gọi API nào?
Gateway chuyển request đi đâu?
Controller nào nhận?
Service nào xử lý?
Repository nào lấy user?
PasswordHasher kiểm tra mật khẩu như thế nào?
TokenHelper tạo JWT như thế nào?
DTO request/response gồm gì?
```

### 1. API Gateway - `ocelot.json`

Route auth:

```json
{
  "DownstreamPathTemplate": "/api/auth/{everything}",
  "DownstreamHostAndPorts": [{ "Host": "localhost", "Port": 5101 }],
  "UpstreamPathTemplate": "/api/auth/{everything}"
}
```

Ý nghĩa:

```text
Frontend gọi:
/api/auth/login

Gateway nhận ở port 5100.
Ocelot chuyển xuống AuthService port 5101.
```

### 2. `AuthController.cs`

Route controller:

```csharp
[Route("api/auth")]
```

Endpoint login:

```csharp
[HttpPost("login")]
public async Task<IActionResult> Login(LoginRequest request)
{
    try { return Ok(await _auth.LoginAsync(request)); }
    catch (AuthException ex) { return Unauthorized(new { message = ex.Message }); }
}
```

Cần hiểu:

- Controller chỉ nhận request và trả response.
- Logic kiểm tra mật khẩu không nằm ở controller.
- Controller gọi xuống `AuthService.LoginAsync`.

### 3. `AuthService.cs`

Hàm `LoginAsync` xử lý:

```text
1. Chuẩn hoá email.
2. Tìm user theo email, lấy kèm role.
3. Kiểm tra user có tồn tại không.
4. Kiểm tra mật khẩu bằng PasswordHasher.
5. Kiểm tra user có đang Active không.
6. Lấy danh sách role.
7. Tạo JWT token.
8. Trả AuthResponse.
```

Đoạn kiểm tra email/password:

```csharp
if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
{
    throw new AuthException("Email hoặc mật khẩu không đúng.");
}
```

Đoạn kiểm tra trạng thái:

```csharp
if (user.Status != (int)EntityStatus.Active)
{
    throw new AuthException("Tài khoản đã bị khóa.");
}
```

Đoạn tạo response:

```csharp
var roles = user.UserRoles.Select(ur => ur.Role.Code).ToArray();
return BuildAuthResponse(user, roles);
```

### 4. DTO Auth

File:

```text
backend/src/MoToSale.DTO/Auth/AuthDtos.cs
```

Các DTO chính:

```csharp
public record LoginRequest(string Email, string Password);

public record AuthResponse(
    string Token,
    DateTime ExpiresAt,
    UserResponse User
);

public record UserResponse(
    int Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    IEnumerable<string> Roles
);
```

Giải thích:

- `LoginRequest`: dữ liệu frontend gửi lên khi đăng nhập.
- `AuthResponse`: dữ liệu backend trả về sau khi đăng nhập thành công.
- `UserResponse`: thông tin user trả về cho frontend.

## VII. Câu hỏi vấn đáp cần luyện

### Nhóm 1 - Tổng quan

1. Project MoToSale v2 dùng để làm gì?
2. Project có mấy phần chính?
3. Em phụ trách phần nào?
4. `frontend-admin` khác `frontend-store` ở đâu?
5. Backend có những service chính nào?
6. API Gateway có vai trò gì?
7. Vì sao phần Backend và Frontend Admin phải hiểu cùng nhau?

### Nhóm 2 - Frontend Auth

1. Khi bấm nút Đăng nhập, hàm nào trong `Login.jsx` chạy?
2. `Login.jsx` gọi hàm `login` từ đâu?
3. `AuthContext.login` gọi service nào?
4. `authService.login` gọi endpoint nào?
5. Vì sao gọi `api.post('/auth/login')` nhưng request thật là `/api/auth/login`?
6. `admin_token` được lưu ở đâu?
7. `admin_user` được lưu ở đâu?
8. Khi refresh trang, app đọc lại user từ đâu?
9. `isAuthenticated` được tính như thế nào?
10. Logout xoá những gì?
11. Route admin được khai báo ở đâu?
12. Vì sao các trang admin phải bọc bằng `ProtectedRoute`?
13. `MainLayout` xuất hiện sau đăng nhập để làm gì?

### Nhóm 3 - Axios và JWT

1. JWT token được gắn vào request ở file nào?
2. Header chứa token tên là gì?
3. Cú pháp header JWT là gì?
4. Nếu backend trả `401` thì frontend làm gì?
5. Vì sao request login không bị redirect vòng lặp khi lỗi `401`?

### Nhóm 4 - ProtectedRoute

1. `ProtectedRoute` dùng để làm gì?
2. Nếu đang loading thì hiển thị gì?
3. Nếu chưa đăng nhập thì điều hướng đi đâu?
4. Nếu sai role thì hiển thị gì?
5. Route nào chỉ Admin được vào?
6. Admin và Staff được kiểm tra bằng hàm nào?

### Nhóm 5 - Backend Auth

1. Endpoint login backend là gì?
2. Controller nào nhận request login?
3. Controller gọi service nào?
4. Mật khẩu được kiểm tra ở đâu?
5. Token được tạo ở đâu?
6. Backend trả về những dữ liệu gì sau khi login thành công?
7. Sai email/password thì backend trả status gì?

### Nhóm 6 - Phạm vi trách nhiệm

1. Nếu giảng viên hỏi em làm phần nào thì trả lời sao?
2. Nếu thêm một trang quản lý mới trong admin, em cần tạo những file frontend và backend nào?
3. Nếu trang admin gọi API lỗi `401`, em kiểm tra file nào trước?
4. Nếu admin không hiển thị đúng quyền, em kiểm tra file nào?
5. Nếu backend chưa có API cho admin, em cần sửa thêm những lớp nào?
6. Nếu giảng viên hỏi đã code database như thế nào, em trả lời sao?

## VIII. Bài tập code lại

### Bài 1 - Code lại `ProtectedRoute` bản đơn giản

Yêu cầu:

- Không nhìn code gốc.
- Viết đủ 4 trường hợp:
  - loading
  - chưa đăng nhập
  - sai role
  - hợp lệ

Gợi ý:

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = ['Admin', 'Staff'] }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(...roles)) {
    return <div>Bạn không có quyền truy cập.</div>;
  }

  return children;
};

export default ProtectedRoute;
```

### Bài 2 - Code lại interceptor gắn token

Yêu cầu:

- Lấy `admin_token` từ `localStorage`.
- Nếu có token thì gắn vào `Authorization`.

Gợi ý:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

### Bài 3 - Thêm hiển thị email trong Navbar

Yêu cầu:

- Lấy `user` từ `useAuth()`.
- Hiển thị `user.email` trong dropdown.

Gợi ý:

```jsx
const { user } = useAuth();
```

```jsx
<span>{user?.email}</span>
```

## IX. Câu trả lời mẫu khi bị hỏi

### Câu 0: Em phụ trách phần nào trong project?

Trả lời:

```text
Em phụ trách phần Backend và Frontend Admin. Frontend Admin là trang quản trị cho Admin/Staff để quản lý sản phẩm, danh mục, hãng, đơn hàng, POS, voucher, kho, bảo hành, báo cáo và người dùng. Ở frontend em nắm các page React, routing, AuthContext, ProtectedRoute, service gọi API và layout admin. Ở backend em nắm controller, service, repository, DTO, entity, DbContext, migration và luồng xử lý request từ admin xuống database.
```

### Câu 1: Luồng đăng nhập admin chạy như thế nào?

Trả lời:

```text
Khi người dùng nhập email/password và bấm Đăng nhập, Login.jsx gọi hàm login trong AuthContext. AuthContext gọi authService.login, hàm này dùng axios instance trong api.js để post lên /api/auth/login. Request đi qua API Gateway, Ocelot route /api/auth/* xuống AuthService port 5101. AuthController nhận LoginRequest và gọi AuthService.LoginAsync. Service tìm user theo email, verify password, kiểm tra trạng thái active, lấy role và tạo JWT token. Backend trả token và user về frontend. AuthContext lưu token vào localStorage với key admin_token, lưu user vào admin_user, setUser, sau đó Login.jsx navigate về dashboard. Các route admin được ProtectedRoute bảo vệ, nếu chưa có user thì redirect về /login.
```

### Câu 2: Nếu token hết hạn hoặc sai thì sao?

Trả lời:

```text
Khi gọi API mà backend trả 401, response interceptor trong api.js sẽ xoá admin_token và admin_user khỏi localStorage, sau đó chuyển người dùng về /login.
```

### Câu 3: Admin và Staff được phân quyền ở đâu?

Trả lời:

```text
AuthContext có hàm hasAdminAccess để chỉ chấp nhận user có role Admin hoặc Staff. ProtectedRoute mặc định cho Admin và Staff vào. Một số route truyền roles={['Admin']} để chỉ Admin được vào, ví dụ route quản lý users hoặc audit logs.
```

### Câu 4: Vì sao cần `AuthContext`?

Trả lời:

```text
AuthContext giúp lưu trạng thái đăng nhập dùng chung toàn app. Nếu không có AuthContext, mỗi component phải tự đọc localStorage hoặc tự gọi API để biết user là ai. Với AuthContext, các component chỉ cần gọi useAuth để lấy user, login, logout, isAuthenticated, isAdmin hoặc hasRole.
```

### Câu 5: Nếu thêm một trang admin mới thì cần làm gì?

Trả lời:

```text
Trước hết em tạo page trong frontend-admin, tạo service JS nếu cần gọi API, sau đó thêm route trong App.jsx và thêm menu trong Sidebar.jsx. Nếu route cần đăng nhập thì bọc bằng ProtectedRoute và MainLayout. Nếu backend đã có API thì service gọi endpoint đó qua api.js. Nếu backend chưa có API thì cần thêm controller/service/DTO tương ứng ở backend.
```

### Câu 6: Nếu giảng viên hỏi đã code database như thế nào?

Trả lời:

```text
Dự án dùng SQL Server và Entity Framework Core theo hướng code-first. Các bảng được định nghĩa bằng Entity trong MoToSale.Entities, ví dụ User, Product, Order, Voucher, Inventory. DbContext chính là AppDbContext trong MoToSale.Repository, trong đó khai báo các DbSet tương ứng với bảng và cấu hình quan hệ dữ liệu. Khi thay đổi cấu trúc DB thì sửa Entity hoặc cấu hình trong AppDbContext, sau đó tạo migration EF Core để cập nhật database. Khi APIService chạy, backend có cơ chế migrate và seed dữ liệu mẫu. Luồng đọc ghi DB là Controller gọi Service, Service dùng Repository hoặc AppDbContext, sau đó EF Core chuyển thành câu lệnh SQL xuống SQL Server.
```

## X. Checklist cuối ngày

Trước khi sang Ngày 2, phải làm được:

- [ ] Vẽ lại luồng đăng nhập không nhìn code.
- [ ] Nói rõ được mình phụ trách Backend và Frontend Admin.
- [ ] Giải thích được vai trò của `Login.jsx`.
- [ ] Giải thích được vai trò của `AuthContext.jsx`.
- [ ] Giải thích được vai trò của `api.js`.
- [ ] Giải thích được vai trò của `authService.js`.
- [ ] Giải thích được vai trò của `ProtectedRoute.jsx`.
- [ ] Giải thích được route Admin trong `App.jsx`.
- [ ] Giải thích được `MainLayout`, `Navbar`, `Sidebar` dùng để làm gì.
- [ ] Biết `/api/auth/login` đi qua Gateway xuống AuthService.
- [ ] Giải thích được backend AuthController, AuthService, DTO, repository trong luồng login.
- [ ] Giải thích được database dùng Entity, AppDbContext, migration và SQL Server.
- [ ] Code lại được `ProtectedRoute` bản đơn giản.
- [ ] Code lại được request interceptor gắn token.
- [ ] Trả lời được ít nhất 15 câu hỏi vấn đáp trong mục VII.
