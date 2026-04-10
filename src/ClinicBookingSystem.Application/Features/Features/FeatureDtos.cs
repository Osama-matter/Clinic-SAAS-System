using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Features;

public record FeatureDto(
    Guid Id,
    string Name,
    string? NameAr,
    string Code,
    FeatureType Type,
    string Description,
    DateTime CreatedAt
);

public record CreateFeatureCommand(
    string Name,
    string? NameAr,
    string Code,
    FeatureType Type,
    string Description
) : IRequest<FeatureDto>;

public record UpdateFeatureCommand(
    Guid Id,
    string Name,
    string? NameAr,
    string Code,
    FeatureType Type,
    string Description
) : IRequest<FeatureDto>;

public record DeleteFeatureCommand(Guid Id) : IRequest<Unit>;

public record GetFeatureByIdQuery(Guid Id) : IRequest<FeatureDto>;
public record GetFeaturesQuery() : IRequest<IEnumerable<FeatureDto>>;
