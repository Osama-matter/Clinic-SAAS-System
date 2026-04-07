using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.ClinicSubscriptions;

public class ClinicSubscriptionHandlers :
    IRequestHandler<CreateClinicSubscriptionCommand, ClinicSubscriptionDto>,
    IRequestHandler<UpdateClinicSubscriptionStatusCommand, ClinicSubscriptionDto>,
    IRequestHandler<GetClinicSubscriptionByIdQuery, ClinicSubscriptionDto>,
    IRequestHandler<GetClinicSubscriptionsQuery, IEnumerable<ClinicSubscriptionDto>>
{
    private readonly IUnitOfWork _uow;

    public ClinicSubscriptionHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ClinicSubscriptionDto> Handle(CreateClinicSubscriptionCommand request, CancellationToken cancellationToken)
    {
        if (request.ExpiresAt <= request.StartDate)
            throw new DomainException("ExpiresAt must be greater than StartDate.");

        if (request.PaidAmount < 0)
            throw new DomainException("PaidAmount cannot be negative.");

        if (string.IsNullOrWhiteSpace(request.PaymentRef))
            throw new DomainException("PaymentRef is required.");

        var clinic = await _uow.Tenants.GetByIdAsync(request.ClinicId, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.ClinicId);

        var plan = await _uow.Planes.GetByIdAsync(request.PlanId, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.PlanId);

        var overlapping = await _uow.ClinicSubscriptions.GetAllAsync(
            cs => cs.ClinicId == clinic.Id
                  && (cs.Status == SubscriptionStatus.Active || cs.Status == SubscriptionStatus.Trial)
                  && cs.StartDate < request.ExpiresAt
                  && request.StartDate < cs.ExpiresAt,
            cancellationToken);

        if (overlapping.Any())
            throw new DomainException("There is already an active subscription that overlaps with this period.");

        var subscription = new ClinicSubscription
        {
            ClinicId = clinic.Id,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
            StartDate = request.StartDate,
            ExpiresAt = request.ExpiresAt,
            PaidAmount = request.PaidAmount,
            PaymentRef = request.PaymentRef.Trim()
        };

        await _uow.ClinicSubscriptions.AddAsync(subscription, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(subscription);
    }

    public async Task<ClinicSubscriptionDto> Handle(UpdateClinicSubscriptionStatusCommand request, CancellationToken cancellationToken)
    {
        var subscription = await _uow.ClinicSubscriptions.GetByIdAsync(request.SubscriptionId, cancellationToken)
            ?? throw new NotFoundException(nameof(ClinicSubscription), request.SubscriptionId);

        subscription.Status = request.Status;
        subscription.UpdatedAt = DateTime.UtcNow;

        await _uow.ClinicSubscriptions.UpdateAsync(subscription, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(subscription);
    }

    public async Task<ClinicSubscriptionDto> Handle(GetClinicSubscriptionByIdQuery request, CancellationToken cancellationToken)
    {
        var subscription = await _uow.ClinicSubscriptions.GetByIdAsync(request.SubscriptionId, cancellationToken)
            ?? throw new NotFoundException(nameof(ClinicSubscription), request.SubscriptionId);

        return MapToDto(subscription);
    }

    public async Task<IEnumerable<ClinicSubscriptionDto>> Handle(GetClinicSubscriptionsQuery request, CancellationToken cancellationToken)
    {
        var clinic = await _uow.Tenants.GetByIdAsync(request.ClinicId, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.ClinicId);

        var subscriptions = await _uow.ClinicSubscriptions.GetAllAsync(cs => cs.ClinicId == clinic.Id, cancellationToken);
        return subscriptions.Select(MapToDto);
    }

    private static ClinicSubscriptionDto MapToDto(ClinicSubscription subscription) => new(
        subscription.Id,
        subscription.ClinicId,
        subscription.PlanId,
        subscription.Status,
        subscription.StartDate,
        subscription.ExpiresAt,
        subscription.PaidAmount,
        subscription.PaymentRef,
        subscription.CreatedAt,
        subscription.UpdatedAt
    );
}
