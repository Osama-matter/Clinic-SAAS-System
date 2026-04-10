using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace ClinicBookingSystem.Infrastructure.Services;

public class PlanService : IPlanService
{
    private readonly IUnitOfWork _uow;
    private readonly IMemoryCache _cache;
    private const string CachePrefix = "tenant_plan_";

    public PlanService(IUnitOfWork uow, IMemoryCache cache)
    {
        _uow = uow;
        _cache = cache;
    }

    public async Task<bool> IsSubscriptionActiveAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{CachePrefix}{tenantId}_status";
        if (_cache.TryGetValue(cacheKey, out bool isActive)) return isActive;

        var subscriptions = await _uow.ClinicSubscriptions.GetAllAsync(
            s => s.ClinicId == tenantId && 
            (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial) &&
            s.ExpiresAt > DateTime.UtcNow,
            cancellationToken);

        isActive = subscriptions.Any();
        
        _cache.Set(cacheKey, isActive, TimeSpan.FromMinutes(5));
        return isActive;
    }

    public async Task<bool> CheckLimitAsync(Guid tenantId, string featureCode, CancellationToken cancellationToken = default)
    {
        // 1. Get active subscription
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

        int currentUsage = featureCode switch
        {
            SaaSFeatureCodes.DoctorLimit or "DoctorLimit" or "MaxDoctors" => (await _uow.Doctors.GetAllAsync(d => d.TenantId == tenantId, cancellationToken)).Count(),
            SaaSFeatureCodes.PatientLimit or "PatientLimit" or "MaxPatients" => (await _uow.Patients.GetAllAsync(p => p.TenantId == tenantId, cancellationToken)).Count(),
            SaaSFeatureCodes.AppointmentsLimit or "AppointmentsLimit" or "MaxBookings" => (await _uow.Appointments.GetAllAsync(a => a.TenantId == tenantId, cancellationToken)).Count(),
            _ => 0
        };

        return currentUsage < limitValue.Value;
    }
}
