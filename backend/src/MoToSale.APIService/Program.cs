using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MoToSale.Common;
using MoToSale.Repository;
using MoToSale.Repository.Catalog;
using MoToSale.Repository.EFCore;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Identity;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;
using MoToSale.Services.Catalog;
using MoToSale.Services.Content;
using MoToSale.Services.Audit;
using MoToSale.Services.Customers;
using MoToSale.Services.Inventory;
using MoToSale.Services.Ordering;
using MoToSale.Services.Payments;
using MoToSale.Services.Operations;
using MoToSale.Services.Reports;
using MoToSale.Services.Settings;

var builder = WebApplication.CreateBuilder(args);

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt config chưa được thiết lập.");

builder.Services.AddSingleton(jwt);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Generic repository cho các entity đơn giản + repository cụ thể cho Product.
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ISkuRepository, SkuRepository>();
builder.Services.AddScoped<IProductImageRepository, ProductImageRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<MoToSale.APIService.Uploads.IImageStorage, MoToSale.APIService.Uploads.LocalImageStorage>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<IStockDocumentRepository, StockDocumentRepository>();
builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IVoucherRepository, VoucherRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<IContentService, ContentService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IFavoriteService, FavoriteService>();
builder.Services.AddScoped<IWarrantyService, WarrantyService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IAdvancedOperationsService, AdvancedOperationsService>();
builder.Services.AddScoped<IBusinessOperationsService, BusinessOperationsService>();
builder.Services.AddScoped<IInstallmentService, InstallmentService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<ICustomerProfileService, CustomerProfileService>();
builder.Services.AddScoped<IStorefrontSettingsService, StorefrontSettingsService>();
builder.Services.AddScoped<IReportService, ReportService>();

// Job nền tự hủy đơn hết hạn giữ chỗ để trả tồn kho.
builder.Services.AddHostedService<MoToSale.APIService.Hosting.ReservationCleanupService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
        };
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                string? rawUserId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(rawUserId, out int userId))
                {
                    context.Fail("Token kh\u00f4ng h\u1ee3p l\u1ec7.");
                    return;
                }

                var users = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                var user = await users.GetByIdWithRolesAsync(userId);
                if (user == null || user.Status != (int)EntityStatus.Active)
                {
                    context.Fail("T\u00e0i kho\u1ea3n \u0111\u00e3 b\u1ecb kh\u00f3a.");
                }
            }
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SeedConfiguration.RunAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
    await SeedConfiguration.SeedCatalogAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(); // phục vụ ảnh trong wwwroot/uploads
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "APIService" }));

app.Run();
