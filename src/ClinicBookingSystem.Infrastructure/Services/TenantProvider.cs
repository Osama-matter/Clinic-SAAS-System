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
            // 1. Try to get from JWT claims (Multiple casing for Production environments)
            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id")?.Value
                     ?? _httpContextAccessor.HttpContext?.User?.FindFirst("TenantId")?.Value
                     ?? _httpContextAccessor.HttpContext?.User?.FindFirst("tenantid")?.Value;

            if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var tenantIdFromClaim))
                return tenantIdFromClaim;

            // 2. Try to get from Header (Fallback/Guest access)
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
