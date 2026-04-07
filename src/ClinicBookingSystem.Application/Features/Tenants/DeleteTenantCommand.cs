using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record DeleteTenantCommand(Guid Id) : IRequest<Unit>;

public class DeleteTenantCommandHandler : IRequestHandler<DeleteTenantCommand, Unit>
{
    private readonly IUnitOfWork _uow;

    public DeleteTenantCommandHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Unit> Handle(DeleteTenantCommand request, CancellationToken cancellationToken)
    {
        var tenant = await _uow.Tenants.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.Id);

        await _uow.Tenants.DeleteAsync(tenant, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
