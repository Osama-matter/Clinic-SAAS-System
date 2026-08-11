using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

public record CreatePatientCommand(
    string Name,
    string Phone,
    GenderType Gender,
    DateTime DateOfBirth,
    string? Allergies = null,
    string? ChronicDiseases = null,
    string? DrugHistory = null
) : IRequest<PatientDto>;

public class CreatePatientCommandHandler : IRequestHandler<CreatePatientCommand, PatientDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ISaaSEnforcementService _saas;
    private readonly ICurrentUserService _currentUser;

    public CreatePatientCommandHandler(
        IUnitOfWork uow, 
        ISaaSEnforcementService saas,
        ICurrentUserService currentUser)
    {
        _uow = uow;
        _saas = saas;
        _currentUser = currentUser;
    }

    public async Task<PatientDto> Handle(CreatePatientCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _currentUser.TenantId
            ?? throw new DomainException("Tenant ID is required.");

        var existingCount = await _uow.Patients.CountAsync(p => p.TenantId == tenantId, cancellationToken);
        await _saas.CheckLimitAsync(SaaSFeatureCodes.PatientLimit, existingCount, cancellationToken);

        var patient = new Patient
        {
            TenantId = tenantId,
            Name = request.Name,
            Phone = request.Phone,
            Gender = request.Gender,
            DateOfBirth = request.DateOfBirth,
            Allergies = request.Allergies,
            ChronicDiseases = request.ChronicDiseases,
            DrugHistory = request.DrugHistory
        };

        await _uow.Patients.AddAsync(patient, cancellationToken);
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
}
