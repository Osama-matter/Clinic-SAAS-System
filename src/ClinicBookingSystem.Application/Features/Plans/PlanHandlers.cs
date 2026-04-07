using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Plans;

public class PlanHandlers :
    IRequestHandler<CreatePlanCommand, PlanDto>,
    IRequestHandler<UpdatePlanCommand, PlanDto>,
    IRequestHandler<DeletePlanCommand, Unit>,
    IRequestHandler<GetPlanByIdQuery, PlanDto>,
    IRequestHandler<GetPlansQuery, IEnumerable<PlanDto>>
{
    private readonly IUnitOfWork _uow;

    public PlanHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<PlanDto> Handle(CreatePlanCommand request, CancellationToken cancellationToken)
    {
        var existing = await _uow.Planes.GetAllAsync(p => p.Name == request.Name, cancellationToken);
        if (existing.Any())
            throw new DomainException("Plan name already exists.");

        var plan = new Plan
        {
            Name = request.Name,
            Price = request.Price,
            DurationDays = request.DurationDays,
            IsActive = request.IsActive
        };

        await _uow.Planes.AddAsync(plan, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(plan);
    }

    public async Task<PlanDto> Handle(UpdatePlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await _uow.Planes.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.Id);

        var existing = await _uow.Planes.GetAllAsync(p => p.Name == request.Name && p.Id != request.Id, cancellationToken);
        if (existing.Any())
            throw new DomainException("Plan name already exists.");

        plan.Name = request.Name;
        plan.Price = request.Price;
        plan.DurationDays = request.DurationDays;
        plan.IsActive = request.IsActive;

        await _uow.Planes.UpdateAsync(plan, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(plan);
    }

    public async Task<Unit> Handle(DeletePlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await _uow.Planes.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.Id);

        await _uow.Planes.DeleteAsync(plan, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<PlanDto> Handle(GetPlanByIdQuery request, CancellationToken cancellationToken)
    {
        var plan = await _uow.Planes.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.Id);

        return MapToDto(plan);
    }

    public async Task<IEnumerable<PlanDto>> Handle(GetPlansQuery request, CancellationToken cancellationToken)
    {
        var plans = await _uow.Planes.GetAllAsync(
            request.IsActive.HasValue ? p => p.IsActive == request.IsActive.Value : null,
            cancellationToken);

        return plans.Select(MapToDto);
    }

    private static PlanDto MapToDto(Plan plan) => new(
        plan.Id,
        plan.Name,
        plan.Price,
        plan.DurationDays,
        plan.IsActive,
        plan.CreatedAt
    );
}
