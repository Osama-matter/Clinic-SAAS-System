using ClinicBookingSystem.Domain.Entities;

namespace ClinicBookingSystem.Application.Features.Patients;

public record PatientDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Phone,
    GenderType Gender,
    DateTime DateOfBirth,
    string? Allergies,
    string? ChronicDiseases,
    string? DrugHistory
);

public record PagedPatientsResultDto(
    IEnumerable<PatientDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
