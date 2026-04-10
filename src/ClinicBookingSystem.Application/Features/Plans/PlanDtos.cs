using MediatR;
using System.Collections.Generic;

namespace ClinicBookingSystem.Application.Features.Plans;

public record PlanDto(
    Guid Id,
    string Name,
    decimal Price,
    int DurationDays,
    int? MaxDoctors,
    int? MaxPatients,
    int? MaxBookings,
    bool IsActive,
    DateTime CreatedAt
);

public record CreatePlanCommand(
    string Name,
    decimal Price,
    int DurationDays,
    int? MaxDoctors,
    int? MaxPatients,
    int? MaxBookings,
    bool IsActive
) : IRequest<PlanDto>;

public record UpdatePlanCommand(
    Guid Id,
    string Name,
    decimal Price,
    int DurationDays,
    int? MaxDoctors,
    int? MaxPatients,
    int? MaxBookings,
    bool IsActive
) : IRequest<PlanDto>;

public record DeletePlanCommand(Guid Id) : IRequest<Unit>;

public record GetPlanByIdQuery(Guid Id) : IRequest<PlanDto>;
public record GetPlansQuery(bool? IsActive = null) : IRequest<IEnumerable<PlanDto>>;
