using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

public record GetPatientByIdQuery(Guid Id) : IRequest<PatientDto>;

public class GetPatientByIdQueryHandler : IRequestHandler<GetPatientByIdQuery, PatientDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetPatientByIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<PatientDto> Handle(GetPatientByIdQuery request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        EnsureTenantAccess(patient);

        return new PatientDto(
            patient.Id, 
            patient.TenantId ?? Guid.Empty, 
            patient.Name, 
            patient.Phone, 
            patient.Gender, 
            patient.DateOfBirth, 
            patient.Allergies, 
            patient.ChronicDiseases, 
            patient.DrugHistory
        );
    }

    private void EnsureTenantAccess(Patient patient)
    {
        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        var isTenantUser = _currentUser.TenantId.HasValue && _currentUser.TenantId.Value == patient.TenantId;

        if (!isSuperAdmin && !isTenantUser)
            throw new UnauthorizedActionException("You do not have access to this patient's record.");
    }
}
