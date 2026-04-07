using ClinicBookingSystem.Domain.Entities;
using MediatR;

namespace ClinicBookingSystem.Application.Features.PlanFeatures;

public record PlanFeatureDto(
    Guid PlanId,
    Guid FeatureId,
    bool? IsEnabled,
    int? LimitValue
);

public record UpsertPlanFeatureCommand(
    Guid PlanId,
    Guid FeatureId,
    bool? IsEnabled,
    int? LimitValue
) : IRequest<PlanFeatureDto>;

public record DeletePlanFeatureCommand(Guid PlanId, Guid FeatureId) : IRequest<Unit>;

public record GetPlanFeaturesQuery(Guid PlanId) : IRequest<IEnumerable<PlanFeatureDto>>;
