using ClinicBookingSystem.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ClinicBookingSystem.Infrastructure.Services;

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var isAuthenticated = user?.Identity?.IsAuthenticated ?? false;

            // 1. For authenticated users, strictly resolve TenantId from verified JWT claims
            var claim = user?.FindFirst("tenant_id")?.Value
                     ?? user?.FindFirst("TenantId")?.Value
                     ?? user?.FindFirst("tenantid")?.Value;

            if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var tenantIdFromClaim))
                return tenantIdFromClaim;

            // If user is authenticated, DO NOT fallback to client-supplied header to prevent spoofing
            if (isAuthenticated)
                return null;

            // 2. For unauthenticated public/guest requests ONLY, fallback to X-Tenant-Id header
            var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].ToString();
            if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out var tenantIdFromHeader))
                return tenantIdFromHeader;

            return null;
        }
    }

    public ClinicBookingSystem.Domain.Enums.UserRole? Role
    {
        get
        {
            var roleClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value
                         ?? _httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value;

            if (!string.IsNullOrEmpty(roleClaim) && Enum.TryParse<ClinicBookingSystem.Domain.Enums.UserRole>(roleClaim, out var role))
                return role;

            return null;
        }
    }
}
