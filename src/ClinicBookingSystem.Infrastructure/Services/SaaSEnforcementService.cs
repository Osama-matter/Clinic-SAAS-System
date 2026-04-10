using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;

namespace ClinicBookingSystem.Infrastructure.Services;

public class SaaSEnforcementService : ISaaSEnforcementService
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUserService;

    public SaaSEnforcementService(IUnitOfWork uow, ICurrentUserService currentUserService)
    {
        _uow = uow;
        _currentUserService = currentUserService;
    }

    public async Task CheckLimitAsync(string featureCode, int currentCount, CancellationToken cancellationToken = default)
    {
        var limit = await ResolveLimitAsync(featureCode, cancellationToken);
        if (!limit.HasValue)
            return;

        if (currentCount >= limit.Value)
            throw new DomainException($"You have reached the maximum limit ({limit.Value}) for '{featureCode}' on your current plan.");
    }

    public Task CheckFeatureEnabledAsync(string featureCode, CancellationToken cancellationToken = default)
    {
        // Feature flags are intentionally no-ops in the simplified plan model.
        return Task.CompletedTask;
    }

    private async Task<int?> ResolveLimitAsync(string featureCode, CancellationToken cancellationToken)
    {
        var tenantId = _currentUserService.TenantId;

        if (tenantId == null)
            return null;

        if (_currentUserService.Role == "Admin" || _currentUserService.Role == "2")
            return null;

        var activeSubscriptions = await _uow.ClinicSubscriptions.GetAllAsync(
            s => s.ClinicId == tenantId && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial),
            cancellationToken);

        var subscription = activeSubscriptions.FirstOrDefault();
        if (subscription == null)
            throw new DomainException("Clinic does not have an active subscription plan.");

        if (subscription.Status == SubscriptionStatus.Trial)
            return null;

        var plan = await _uow.Planes.GetByIdAsync(subscription.PlanId, cancellationToken)
            ?? throw new DomainException("Subscription plan could not be found.");

        return featureCode switch
        {
            SaaSFeatureCodes.DoctorLimit or "DoctorLimit" or "MaxDoctors" => plan.MaxDoctors,
            SaaSFeatureCodes.PatientLimit or "PatientLimit" or "MaxPatients" => plan.MaxPatients,
            SaaSFeatureCodes.AppointmentsLimit or "AppointmentsLimit" or "MaxBookings" => plan.MaxBookings,
            _ => null
        };
    }
}
