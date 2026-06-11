using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MoToSale.Common.Auth;

/// <summary>Tạo JWT token cho người dùng đã đăng nhập.</summary>
public interface ITokenHelper
{
    (string Token, DateTime ExpiresAt) CreateToken(int userId, string fullName, string email, IEnumerable<string> roles);
}

public class TokenHelper : ITokenHelper
{
    private readonly JwtSettings _jwt;

    public TokenHelper(JwtSettings jwt)
    {
        _jwt = jwt;
    }

    public (string Token, DateTime ExpiresAt) CreateToken(int userId, string fullName, string email, IEnumerable<string> roles)
    {
        DateTime expiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, fullName),
            new Claim(ClaimTypes.Email, email),
        };

        foreach (string role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        byte[] secretKeyBytes = Encoding.UTF8.GetBytes(_jwt.SecretKey);
        var securityKey = new SymmetricSecurityKey(secretKeyBytes);
        var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: signingCredentials);

        string tokenText = new JwtSecurityTokenHandler().WriteToken(token);

        return (tokenText, expiresAt);
    }
}
