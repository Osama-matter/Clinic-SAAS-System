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
        var cacheKey = $"{CachePrefix}{tenantId}_limit_{featureCode}";
        if (_cache.TryGetValue(cacheKey, out bool isWithinLimit)) return isWithinLimit;

        // 1. Get active subscription
        var subscriptions = await _uow.ClinicSubscriptions.GetAllAsync(
            s => s.ClinicId == tenantId && 
            (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial) &&
            s.ExpiresAt > DateTime.UtcNow,
            cancellationToken);

        var activeSub = subscriptions.OrderByDescending(s => s.ExpiresAt).FirstOrDefault();
        if (activeSub == null) return false;

        // 2. Get plan feature
        var planFeatures = await _uow.PlanFeatures.GetAllAsync(
            pf => pf.PlanId == activeSub.PlanId && pf.Feature.Code == featureCode,
            cancellationToken,
            pf => pf.Feature);

        var pf = planFeatures.FirstOrDefault();
        if (pf == null) return false;

        // 3. Check logic
        if (pf.IsEnabled == false) return false;
        if (pf.LimitValue == null) return true; // Unlimited

        // 4. Count current usage
        int currentUsage = featureCode switch
        {
            "MaxDoctors" => (await _uow.Doctors.GetAllAsync(d => d.TenantId == tenantId, cancellationToken)).Count(),
            "MaxPatients" => (await _uow.Patients.GetAllAsync(p => p.TenantId == tenantId, cancellationToken)).Count(),
            _ => 0
        };

        isWithinLimit = currentUsage < pf.LimitValue.Value;
        
        _cache.Set(cacheKey, isWithinLimit, TimeSpan.FromMinutes(2));
        return isWithinLimit;
    }
}
