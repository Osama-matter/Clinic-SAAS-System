namespace ClinicBookingSystem.Application.Interfaces;

public interface ITenantProvider
{
    Guid? TenantId { get; }
}
