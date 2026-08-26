using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ClinicBookingSystem.Infrastructure.Services;

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly AsyncLocal<Guid?> _tenantOverride = new();

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? Id
    {
        get
        {
            // 1. Explicit server-side AsyncLocal override (e.g. background job, explicit scope)
            if (_tenantOverride.Value.HasValue)
                return _tenantOverride.Value.Value;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
                return null;

            var user = httpContext.User;
            var isAuthenticated = user?.Identity?.IsAuthenticated ?? false;

            if (isAuthenticated)
            {
                var role = Role;

                // 2. SuperAdmin is allowed to explicitly target a tenant via header if needed
                if (role == UserRole.SuperAdmin)
                {
                    var superAdminHeader = httpContext.Request.Headers["X-Tenant-Id"].ToString();
                    if (!string.IsNullOrEmpty(superAdminHeader) && Guid.TryParse(superAdminHeader, out var tenantIdFromSuperAdmin))
                        return tenantIdFromSuperAdmin;

                    return null; // Global access for SuperAdmin
                }

                // 3. For ALL regular users (Admin, Doctor, Receptionist, Patient):
                // STRICTLY resolve TenantId from verified cryptographically signed JWT claims.
                // Any client-supplied X-Tenant-Id header, body, or route is strictly IGNORED.
                var claim = user?.FindFirst("TenantId")?.Value
                         ?? user?.FindFirst("tenant_id")?.Value
                         ?? user?.FindFirst("tenantid")?.Value;

                if (!string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out var tenantIdFromClaim))
                    return tenantIdFromClaim;

                return null;
            }

            // 4. For Unauthenticated public/guest requests ONLY (e.g. public booking page),
            // fallback to X-Tenant-Id header.
            var header = httpContext.Request.Headers["X-Tenant-Id"].ToString();
            if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out var tenantIdFromHeader))
                return tenantIdFromHeader;

            return null;
        }
    }

    public Guid? TenantId => Id;

    public bool IsAvailable => Id.HasValue;

    public bool IsSuperAdmin => Role == UserRole.SuperAdmin;

    public UserRole? Role
    {
        get
        {
            var roleClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value
                         ?? _httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value;

            if (!string.IsNullOrEmpty(roleClaim))
            {
                if (Enum.TryParse<UserRole>(roleClaim, ignoreCase: true, out var role))
                    return role;

                // Numeric fallback
                if (int.TryParse(roleClaim, out var roleInt) && Enum.IsDefined(typeof(UserRole), roleInt))
                    return (UserRole)roleInt;
            }

            return null;
        }
    }

    public IDisposable Change(Guid? tenantId)
    {
        var previous = _tenantOverride.Value;
        _tenantOverride.Value = tenantId;
        return new TenantScopeDisposable(() => _tenantOverride.Value = previous);
    }

    private sealed class TenantScopeDisposable : IDisposable
    {
        private readonly Action _onDispose;
        private bool _disposed;

        public TenantScopeDisposable(Action onDispose)
        {
            _onDispose = onDispose;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _onDispose();
            }
        }
    }
}
