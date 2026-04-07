using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.PlanFeatures;

public class PlanFeatureHandlers :
    IRequestHandler<UpsertPlanFeatureCommand, PlanFeatureDto>,
    IRequestHandler<DeletePlanFeatureCommand, Unit>,
    IRequestHandler<GetPlanFeaturesQuery, IEnumerable<PlanFeatureDto>>
{
    private readonly IUnitOfWork _uow;

    public PlanFeatureHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<PlanFeatureDto> Handle(UpsertPlanFeatureCommand request, CancellationToken cancellationToken)
    {
        var plan = await _uow.Planes.GetByIdAsync(request.PlanId, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.PlanId);

        var feature = await _uow.Features.GetByIdAsync(request.FeatureId, cancellationToken)
            ?? throw new NotFoundException(nameof(Feature), request.FeatureId);

        var existing = await _uow.PlanFeatures.GetAllAsync(
            pf => pf.PlanId == request.PlanId && pf.FeatureId == request.FeatureId,
            cancellationToken);

        var planFeature = existing.FirstOrDefault();
        if (planFeature == null)
        {
            planFeature = new PlanFeature
            {
                PlanId = plan.Id,
                FeatureId = feature.Id,
                IsEnabled = request.IsEnabled,
                LimitValue = request.LimitValue
            };

            await _uow.PlanFeatures.AddAsync(planFeature, cancellationToken);
        }
        else
        {
            planFeature.IsEnabled = request.IsEnabled;
            planFeature.LimitValue = request.LimitValue;
            await _uow.PlanFeatures.UpdateAsync(planFeature, cancellationToken);
        }

        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(planFeature);
    }

    public async Task<Unit> Handle(DeletePlanFeatureCommand request, CancellationToken cancellationToken)
    {
        var existing = await _uow.PlanFeatures.GetAllAsync(
            pf => pf.PlanId == request.PlanId && pf.FeatureId == request.FeatureId,
            cancellationToken);

        var planFeature = existing.FirstOrDefault()
            ?? throw new NotFoundException(nameof(PlanFeature), $"{request.PlanId}/{request.FeatureId}");

        await _uow.PlanFeatures.DeleteAsync(planFeature, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<IEnumerable<PlanFeatureDto>> Handle(GetPlanFeaturesQuery request, CancellationToken cancellationToken)
    {
        var plan = await _uow.Planes.GetByIdAsync(request.PlanId, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.PlanId);

        var items = await _uow.PlanFeatures.GetAllAsync(pf => pf.PlanId == plan.Id, cancellationToken);
        return items.Select(MapToDto);
    }

    private static PlanFeatureDto MapToDto(PlanFeature planFeature) => new(
        planFeature.PlanId,
        planFeature.FeatureId,
        planFeature.IsEnabled,
        planFeature.LimitValue
    );
}
