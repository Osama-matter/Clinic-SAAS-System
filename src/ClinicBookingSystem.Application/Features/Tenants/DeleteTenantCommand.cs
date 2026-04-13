using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record DeleteTenantCommand(Guid Id) : IRequest<Unit>;

public class DeleteTenantCommandHandler : IRequestHandler<DeleteTenantCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ClinicBookingSystem.Application.Interfaces.ICurrentUserService _currentUser;

    public DeleteTenantCommandHandler(IUnitOfWork uow, ClinicBookingSystem.Application.Interfaces.ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteTenantCommand request, CancellationToken cancellationToken)
    {
        // Only SuperAdmin can delete clinics
        var isSuperAdmin = _currentUser.Role == "6" || _currentUser.Role == "SuperAdmin";
        if (!isSuperAdmin)
            throw new UnauthorizedActionException("Only SuperAdmin can delete clinics.");

        var tenant = await _uow.Tenants.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.Id);

        await _uow.Tenants.DeleteAsync(tenant, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
