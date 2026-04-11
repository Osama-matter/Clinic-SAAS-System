using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;

namespace ClinicBookingSystem.Infrastructure.Services;

public class PlanService : IPlanService
{
    private readonly IUnitOfWork _uow;
    private readonly ITenantProvider _tenantProvider;

    public PlanService(IUnitOfWork uow, ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<bool> IsSubscriptionActiveAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        if (_tenantProvider.Role == UserRole.SuperAdmin)
            return true;

        return await _uow.ClinicSubscriptions.AnyAsync(
            s => s.ClinicId == tenantId &&
            (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial) &&
            s.ExpiresAt > DateTime.UtcNow,
            cancellationToken);
    }

    public async Task<bool> CheckLimitAsync(Guid tenantId, string featureCode, CancellationToken cancellationToken = default)
    {
        if (_tenantProvider.Role == UserRole.SuperAdmin)
            return true;

        var subscriptions = await _uow.ClinicSubscriptions.GetAllAsync(
            s => s.ClinicId == tenantId &&
            (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial) &&
            s.ExpiresAt > DateTime.UtcNow,
            cancellationToken);

        var activeSub = subscriptions.OrderByDescending(s => s.ExpiresAt).FirstOrDefault();
        if (activeSub == null) return false;

        if (activeSub.Status == SubscriptionStatus.Trial)
            return true;

        var plan = await _uow.Planes.GetByIdAsync(activeSub.PlanId, cancellationToken);
        if (plan == null)
            return false;

        var limitValue = featureCode switch
        {
            SaaSFeatureCodes.DoctorLimit or "DoctorLimit" or "MaxDoctors" => plan.MaxDoctors,
            SaaSFeatureCodes.PatientLimit or "PatientLimit" or "MaxPatients" => plan.MaxPatients,
            SaaSFeatureCodes.AppointmentsLimit or "AppointmentsLimit" or "MaxBookings" => plan.MaxBookings,
            _ => null
        };

        if (limitValue == null)
            return true;

        var currentUsage = featureCode switch
        {
            SaaSFeatureCodes.DoctorLimit or "DoctorLimit" or "MaxDoctors" => await _uow.Doctors.CountAsync(d => d.TenantId == tenantId, cancellationToken),
            SaaSFeatureCodes.PatientLimit or "PatientLimit" or "MaxPatients" => await _uow.Patients.CountAsync(p => p.TenantId == tenantId, cancellationToken),
            SaaSFeatureCodes.AppointmentsLimit or "AppointmentsLimit" or "MaxBookings" => await _uow.Appointments.CountAsync(a => a.TenantId == tenantId, cancellationToken),
            _ => 0
        };

        return currentUsage < limitValue.Value;
    }
}
