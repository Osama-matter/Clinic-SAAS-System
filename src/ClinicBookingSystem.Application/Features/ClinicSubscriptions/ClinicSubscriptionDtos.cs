using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using MediatR;

namespace ClinicBookingSystem.Application.Features.ClinicSubscriptions;

public record ClinicSubscriptionDto(
    Guid Id,
    Guid ClinicId,
    Guid PlanId,
    SubscriptionStatus Status,
    DateTime StartDate,
    DateTime ExpiresAt,
    decimal PaidAmount,
    string PaymentRef,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateClinicSubscriptionCommand(
    Guid ClinicId,
    Guid PlanId,
    DateTime StartDate,
    DateTime ExpiresAt,
    decimal PaidAmount,
    string PaymentRef
) : IRequest<ClinicSubscriptionDto>;

public record UpdateClinicSubscriptionStatusCommand(
    Guid SubscriptionId,
    SubscriptionStatus Status
) : IRequest<ClinicSubscriptionDto>;

public record GetClinicSubscriptionByIdQuery(Guid SubscriptionId) : IRequest<ClinicSubscriptionDto>;
public record GetClinicSubscriptionsQuery(Guid ClinicId) : IRequest<IEnumerable<ClinicSubscriptionDto>>;
