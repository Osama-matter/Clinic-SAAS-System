using ClinicBookingSystem.Domain.Entities;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Patients;

// ── DTOs ──────────────────────────────────────────────
public record PatientDto(
    Guid Id,
    string Name,
    string Phone,
    GenderType Gender,
    DateTime DateOfBirth,
    string? Allergies,
    string? ChronicDiseases,
    string? DrugHistory
);

// ── Commands ──────────────────────────────────────────
public record CreatePatientCommand(
    string Name,
    string Phone,
    GenderType Gender,
    DateTime DateOfBirth,
    string? Allergies = null,
    string? ChronicDiseases = null,
    string? DrugHistory = null
) : IRequest<PatientDto>;

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

public record DeletePatientCommand(Guid Id) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetPatientByIdQuery(Guid Id) : IRequest<PatientDto>;
public record GetAllPatientsQuery() : IRequest<IEnumerable<PatientDto>>;
