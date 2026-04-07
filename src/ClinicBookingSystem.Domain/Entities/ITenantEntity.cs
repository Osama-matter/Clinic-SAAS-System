namespace ClinicBookingSystem.Domain.Entities;

public interface ITenantEntity
{
    Guid? TenantId { get; set; }
    Tenant? Tenant { get; set; }
}
