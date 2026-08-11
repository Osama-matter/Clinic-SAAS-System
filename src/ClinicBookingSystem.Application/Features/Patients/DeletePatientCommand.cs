using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

public record DeletePatientCommand(Guid Id) : IRequest<Unit>;

public class DeletePatientCommandHandler : IRequestHandler<DeletePatientCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeletePatientCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeletePatientCommand request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        EnsureTenantAccess(patient);

        await _uow.Patients.DeleteAsync(patient, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    private void EnsureTenantAccess(Patient patient)
    {
        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        var isTenantUser = _currentUser.TenantId.HasValue && _currentUser.TenantId.Value == patient.TenantId;

        if (!isSuperAdmin && !isTenantUser)
            throw new UnauthorizedActionException("You do not have access to this patient's record.");
    }
}
