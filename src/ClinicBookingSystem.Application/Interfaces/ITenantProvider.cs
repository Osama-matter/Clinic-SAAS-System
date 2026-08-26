using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Interfaces;

public interface ITenantProvider : ICurrentTenant
{
    Guid? TenantId => Id;
}
