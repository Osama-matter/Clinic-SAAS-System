using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Features;

public class FeatureHandlers :
    IRequestHandler<CreateFeatureCommand, FeatureDto>,
    IRequestHandler<UpdateFeatureCommand, FeatureDto>,
    IRequestHandler<DeleteFeatureCommand, Unit>,
    IRequestHandler<GetFeatureByIdQuery, FeatureDto>,
    IRequestHandler<GetFeaturesQuery, IEnumerable<FeatureDto>>
{
    private readonly IUnitOfWork _uow;

    public FeatureHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<FeatureDto> Handle(CreateFeatureCommand request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim();

        var existing = await _uow.Features.GetAllAsync(f => f.Code == code, cancellationToken);
        if (existing.Any())
            throw new DomainException("Feature code already exists.");

        var feature = new Feature
        {
            Name = request.Name,
            Code = code,
            Type = request.Type,
            Description = request.Description
        };

        await _uow.Features.AddAsync(feature, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(feature);
    }

    public async Task<FeatureDto> Handle(UpdateFeatureCommand request, CancellationToken cancellationToken)
    {
        var feature = await _uow.Features.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Feature), request.Id);

        var code = request.Code.Trim();
        var existing = await _uow.Features.GetAllAsync(f => f.Code == code && f.Id != request.Id, cancellationToken);
        if (existing.Any())
            throw new DomainException("Feature code already exists.");

        feature.Name = request.Name;
        feature.Code = code;
        feature.Type = request.Type;
        feature.Description = request.Description;

        await _uow.Features.UpdateAsync(feature, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(feature);
    }

    public async Task<Unit> Handle(DeleteFeatureCommand request, CancellationToken cancellationToken)
    {
        var feature = await _uow.Features.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Feature), request.Id);

        await _uow.Features.DeleteAsync(feature, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<FeatureDto> Handle(GetFeatureByIdQuery request, CancellationToken cancellationToken)
    {
        var feature = await _uow.Features.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Feature), request.Id);

        return MapToDto(feature);
    }

    public async Task<IEnumerable<FeatureDto>> Handle(GetFeaturesQuery request, CancellationToken cancellationToken)
    {
        var features = await _uow.Features.GetAllAsync(null, cancellationToken);
        return features.Select(MapToDto);
    }

    private static FeatureDto MapToDto(Feature feature) => new(
        feature.Id,
        feature.Name,
        feature.Code,
        feature.Type,
        feature.Description,
        feature.CreatedAt
    );
}
