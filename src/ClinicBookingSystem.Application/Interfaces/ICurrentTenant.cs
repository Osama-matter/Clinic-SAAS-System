using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Interfaces;

public interface ICurrentTenant
{
    /// <summary>The resolved Tenant ID</summary>
    Guid? Id { get; }

    /// <summary>True if a tenant context is active</summary>
    bool IsAvailable { get; }

    /// <summary>True if current user is SaaS SuperAdmin</summary>
    bool IsSuperAdmin { get; }

    /// <summary>Current user role</summary>
    UserRole? Role { get; }

    /// <summary>
    /// Server-side tenant context switcher for SuperAdmin or background scopes.
    /// Restores previous tenant context on disposal.
    /// </summary>
    IDisposable Change(Guid? tenantId);
}
