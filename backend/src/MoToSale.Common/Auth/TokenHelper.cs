using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MoToSale.Common.Auth;

/// <summary>Tạo và xử lý JWT Token (theo khuôn BaseCore.Common.Auth.TokenHelper).</summary>
public interface ITokenHelper
{
    (string Token, DateTime ExpiresAt) CreateToken(int userId, string fullName, string email, IEnumerable<string> roles);
}

public class TokenHelper : ITokenHelper
{
    private readonly JwtSettings _jwt;

    public TokenHelper(JwtSettings jwt) => _jwt = jwt;

    public (string Token, DateTime ExpiresAt) CreateToken(int userId, string fullName, string email, IEnumerable<string> roles)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, fullName),
            new(ClaimTypes.Email, email),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
