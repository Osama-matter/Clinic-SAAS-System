using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Interfaces;

public interface ITenantProvider
{
    Guid? TenantId { get; }
    UserRole? Role { get; }
}
