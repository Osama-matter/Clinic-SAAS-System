using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

public record UpdatePatientCommand(
    Guid Id,
    string Name,
    string Phone,
    GenderType Gender,
    DateTime DateOfBirth,
    string? Allergies = null,
    string? ChronicDiseases = null,
    string? DrugHistory = null
) : IRequest<PatientDto>;

public class UpdatePatientCommandHandler : IRequestHandler<UpdatePatientCommand, PatientDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdatePatientCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<PatientDto> Handle(UpdatePatientCommand request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        EnsureTenantAccess(patient);

        patient.Name = request.Name;
        patient.Phone = request.Phone;
        patient.Gender = request.Gender;
        patient.DateOfBirth = request.DateOfBirth;
        patient.Allergies = request.Allergies;
        patient.ChronicDiseases = request.ChronicDiseases;
        patient.DrugHistory = request.DrugHistory;

        await _uow.Patients.UpdateAsync(patient, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

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
