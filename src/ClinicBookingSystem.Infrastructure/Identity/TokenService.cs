using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ClinicBookingSystem.Infrastructure.Identity;

public class TokenService : ITokenService
{
    private readonly JwtOptions _jwtOptions;

    public TokenService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public string GenerateAccessToken(Guid userId, string email, ClinicBookingSystem.Domain.Enums.UserRole role, Guid tenantId)
    {
        if (string.IsNullOrWhiteSpace(_jwtOptions.Secret))
            throw new InvalidOperationException("JWT Secret key is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roleName = role.ToString();
        var claimsList = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("unique_name", userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, roleName),
            new Claim("role", roleName),
            new Claim("TenantId", tenantId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("tenantid", tenantId.ToString()),
            new Claim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", roleName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claimsList,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    public string HashRefreshToken(string token)
    {
        if (string.IsNullOrEmpty(token)) return string.Empty;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    public bool ValidateRefreshToken(string token, string storedHash)
    {
        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(storedHash))
            return false;

        var computedHash = HashRefreshToken(token);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(storedHash));
    }
}
