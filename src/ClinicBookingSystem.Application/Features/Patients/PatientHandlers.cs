using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

public class PatientHandlers : 
    IRequestHandler<CreatePatientCommand, PatientDto>,
    IRequestHandler<UpdatePatientCommand, PatientDto>,
    IRequestHandler<DeletePatientCommand, Unit>,
    IRequestHandler<GetPatientByIdQuery, PatientDto>,
    IRequestHandler<GetAllPatientsQuery, IEnumerable<PatientDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService _saas;
    private readonly ClinicBookingSystem.Application.Interfaces.ICurrentUserService _currentUser;

    public PatientHandlers(
        IUnitOfWork uow, 
        ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService saas,
        ClinicBookingSystem.Application.Interfaces.ICurrentUserService currentUser)
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
        await _saas.CheckLimitAsync(ClinicBookingSystem.Application.Interfaces.SaaSFeatureCodes.PatientLimit, existingCount, cancellationToken);

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

        return MapToDto(patient);
    }

    public async Task<PatientDto> Handle(UpdatePatientCommand request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        patient.Name = request.Name;
        patient.Phone = request.Phone;
        patient.Gender = request.Gender;
        patient.DateOfBirth = request.DateOfBirth;
        patient.Allergies = request.Allergies;
        patient.ChronicDiseases = request.ChronicDiseases;
        patient.DrugHistory = request.DrugHistory;

        await _uow.Patients.UpdateAsync(patient, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(patient);
    }

    public async Task<Unit> Handle(DeletePatientCommand request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        await _uow.Patients.DeleteAsync(patient, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<PatientDto> Handle(GetPatientByIdQuery request, CancellationToken cancellationToken)
    {
        var patient = await _uow.Patients.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Patient), request.Id);

        return MapToDto(patient);
    }

    public async Task<IEnumerable<PatientDto>> Handle(GetAllPatientsQuery request, CancellationToken cancellationToken)
    {
        var Enumerable = await _uow.Patients.GetAllAsync(p => true, cancellationToken);
        return Enumerable.Select(MapToDto);
    }

    private static PatientDto MapToDto(Patient p) => new(
        p.Id, p.Name, p.Phone, p.Gender, p.DateOfBirth, p.Allergies, p.ChronicDiseases, p.DrugHistory
    );
}
