using ClinicBookingSystem.Application.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace ClinicBookingSystem.Infrastructure.Identity;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    public Guid? UserId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
        }
    }

    public string? Email => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value;

    public string? Role // this  can  be  "Admin" or "User"  based on the role claim in the JWT token,  and also support both "role" and ClaimTypes.Role for compatibility with different token formats
    {
        get
        {
            var roleClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value 
                          ?? _httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value;
            return roleClaim;
        }
    }

    public Guid? TenantId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var isAuthenticated = user?.Identity?.IsAuthenticated ?? false;

            // 1. Try "TenantId" claim (standard)
            var claim = user?.FindFirst("TenantId")
                      ?? user?.FindFirst("tenant_id")
                      ?? user?.FindFirst("tenantid");

            if (claim != null && Guid.TryParse(claim.Value, out var id))
                return id;

            // If user is authenticated, DO NOT fallback to header to prevent spoofing
            if (isAuthenticated)
                return null;

            // 2. Try Header (X-Tenant-Id) for unauthenticated requests ONLY
            var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].ToString();
            if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out var tenantIdFromHeader))
                return tenantIdFromHeader;

            return null;
        }
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
