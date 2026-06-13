using System.Net;
using System.Threading.RateLimiting;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
// Cho phép override theo môi trường (vd ocelot.Docker.json đổi host downstream sang tên service trong mạng Docker).
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

// CORS: chỉ cho phép các origin đã biết (store/admin + cổng dev) thay vì mở cho mọi domain.
// Có thể override qua cấu hình "Cors:AllowedOrigins". Lưu ý: ở production hai FE gọi /api cùng
// origin qua nginx nên CORS gần như không kích hoạt — whitelist chỉ là lớp phòng thủ thêm.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "https://xemoto.xyz",
        "https://admin.xemoto.xyz",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    };

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

// Rate limiting tại gateway, phân vùng theo IP khách thật (lấy từ X-Forwarded-For do nginx set).
// Đường dẫn nhạy cảm (đăng nhập, đăng ký, quên mật khẩu, gửi hồ sơ trả góp, gửi liên hệ) bị siết
// chặt hơn để chống dò mật khẩu và spam; các API còn lại có hạn mức rộng.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        // Bỏ giới hạn cho gọi trực tiếp từ localhost khi DEV/chạy test (không qua nginx nên không có X-Forwarded-For).
        // Ở production nginx luôn set X-Forwarded-For -> nhánh này không kích hoạt -> vẫn siết theo IP thật.
        if (IsLocalDevRequest(context))
        {
            return RateLimitPartition.GetNoLimiter<string>("local-dev");
        }

        string clientIp = ResolveClientIp(context);
        string path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        bool sensitive = path.Contains("/api/auth/login")
            || path.Contains("/api/auth/register")
            || path.Contains("/api/auth/forgot-password")
            || path.StartsWith("/api/installment-applications")
            || path.StartsWith("/api/content/contacts");

        if (sensitive)
        {
            return RateLimitPartition.GetFixedWindowLimiter($"sensitive:{clientIp}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
        }

        return RateLimitPartition.GetFixedWindowLimiter($"general:{clientIp}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
});

var app = builder.Build();

app.UseCors();
app.UseRateLimiter();
await app.UseOcelot();

app.Run();

// Gọi trực tiếp từ máy local (loopback) và KHÔNG có X-Forwarded-For = môi trường dev/test, không phải qua nginx.
static bool IsLocalDevRequest(HttpContext context)
{
    bool hasForwarded = !string.IsNullOrWhiteSpace(context.Request.Headers["X-Forwarded-For"].FirstOrDefault());
    IPAddress? remoteIp = context.Connection.RemoteIpAddress;
    return !hasForwarded && remoteIp is not null && IPAddress.IsLoopback(remoteIp);
}

// Ưu tiên IP đầu tiên trong X-Forwarded-For (client thật trước chuỗi proxy); fallback IP kết nối.
static string ResolveClientIp(HttpContext context)
{
    string? forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(forwarded))
    {
        return forwarded.Split(',')[0].Trim();
    }

    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
