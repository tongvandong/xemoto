using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.Repository;
using MoToSale.Repository.Identity;
using MoToSale.Services.Identity;

var builder = WebApplication.CreateBuilder(args);

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt config chưa được thiết lập.");

builder.Services.AddSingleton(jwt);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenHelper, TokenHelper>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAddressRepository, AddressRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "AuthService" }));

app.Run();
