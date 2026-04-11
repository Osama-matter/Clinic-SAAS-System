using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.ClinicSubscriptions;

public record SubscriptionFeatureDto(
    string Code,
    string Name,
    string? NameAr,
    bool? IsEnabled,
    int? LimitValue,
    int? CurrentUsage
);

public record MySubscriptionDto(
    Guid Id,
    Guid PlanId,
    Guid ClinicId,
    string PlanName,
    decimal PaidAmount,
    SubscriptionStatus Status,
    DateTime StartDate,
    DateTime ExpiresAt,
    int DaysRemaining,
    bool IsExpiringSoon,
    List<SubscriptionFeatureDto> Features
);

public record GetMySubscriptionQuery : IRequest<MySubscriptionDto>;

public class GetMySubscriptionQueryHandler : IRequestHandler<GetMySubscriptionQuery, MySubscriptionDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ClinicBookingSystem.Application.Interfaces.ITenantProvider _tenantProvider;

    public GetMySubscriptionQueryHandler(IUnitOfWork uow, ClinicBookingSystem.Application.Interfaces.ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<MySubscriptionDto> Handle(GetMySubscriptionQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.TenantId;
        if (tenantId == null)
        {
            // Return a placeholder for SuperAdmin context
            return new MySubscriptionDto(
                Guid.Empty,
                Guid.Empty,
                Guid.Empty,
                "SuperAdmin",
                0,
                SubscriptionStatus.Active,
                DateTime.UtcNow,
                DateTime.UtcNow.AddYears(100),
                9999,
                false,
                new List<SubscriptionFeatureDto>());
        }

        var allSubscriptions = (await _uow.ClinicSubscriptions.GetAllAsync(
                cs => cs.ClinicId == tenantId,
                cancellationToken,
                cs => cs.Plan))
            .ToList();

        var now = DateTime.UtcNow;
        var subscription = allSubscriptions
            .Where(cs =>
                (cs.Status == SubscriptionStatus.Active || cs.Status == SubscriptionStatus.Trial) &&
                cs.ExpiresAt > now)
            .OrderByDescending(cs => cs.ExpiresAt)
            .ThenByDescending(cs => cs.CreatedAt)
            .FirstOrDefault()
            ?? allSubscriptions
                .OrderByDescending(cs => cs.CreatedAt)
                .FirstOrDefault()
            ?? throw new NotFoundException(nameof(ClinicSubscription), tenantId);

        var effectiveStatus = subscription.Status == SubscriptionStatus.Active && subscription.ExpiresAt < now
            ? SubscriptionStatus.Expired
            : subscription.Status;
        var daysRemaining = (int)Math.Ceiling((subscription.ExpiresAt - now).TotalDays);

        // Fetch current usage counts
        var doctorsCount = await _uow.Doctors.CountAsync(d => d.TenantId == tenantId, cancellationToken);
        var patientsCount = await _uow.Patients.CountAsync(p => p.TenantId == tenantId, cancellationToken);
        var bookingsCount = await _uow.Appointments.CountAsync(a => a.TenantId == tenantId, cancellationToken);

        var featureDtos = new List<SubscriptionFeatureDto>();
        if (subscription.Plan != null)
        {
            featureDtos.Add(new SubscriptionFeatureDto(
                "MaxDoctors",
                "Doctors",
                "الدكاترة",
                true,
                subscription.Plan.MaxDoctors,
                doctorsCount));

            featureDtos.Add(new SubscriptionFeatureDto(
                "MaxPatients",
                "Patients",
                "المرضى",
                true,
                subscription.Plan.MaxPatients,
                patientsCount));

            featureDtos.Add(new SubscriptionFeatureDto(
                "MaxBookings",
                "Bookings",
                "الحجوزات",
                true,
                subscription.Plan.MaxBookings,
                bookingsCount));
        }

        return new MySubscriptionDto(
            subscription.Id,
            subscription.PlanId,
            subscription.ClinicId,
            subscription.Plan?.Name ?? "Plan",
            subscription.PaidAmount,
            effectiveStatus,
            subscription.StartDate,
            subscription.ExpiresAt,
            daysRemaining,
            daysRemaining <= 7,
            featureDtos);
    }
}
