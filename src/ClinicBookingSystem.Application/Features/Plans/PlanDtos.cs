using ClinicBookingSystem.Domain.Entities;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Plans;

public record PlanDto(
    Guid Id,
    string Name,
    decimal Price,
    int DurationDays,
    bool IsActive,
    DateTime CreatedAt
);

public record CreatePlanCommand(
    string Name,
    decimal Price,
    int DurationDays,
    bool IsActive
) : IRequest<PlanDto>;

public record UpdatePlanCommand(
    Guid Id,
    string Name,
    decimal Price,
    int DurationDays,
    bool IsActive
) : IRequest<PlanDto>;

public record DeletePlanCommand(Guid Id) : IRequest<Unit>;

public record GetPlanByIdQuery(Guid Id) : IRequest<PlanDto>;
public record GetPlansQuery(bool? IsActive = null) : IRequest<IEnumerable<PlanDto>>;
