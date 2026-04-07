using ClinicBookingSystem.Domain.Entities;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Doctors;

// ── DTOs ──────────────────────────────────────────────
public record DoctorDto(
    Guid Id,
    string Name,
    string Specialty,
    string? Bio,
    string? Photo,
    bool IsActive,
    Guid? TenantId = null
);

// ── Commands ──────────────────────────────────────────
public record CreateDoctorCommand(
    string Name,
    string Email,
    string Password,
    string Specialty,
    string? Bio = null,
    string? Photo = null,
    Guid? TenantId = null
) : IRequest<DoctorDto>;

public record UpdateDoctorCommand(
    Guid Id,
    string Name,
    string Specialty,
    string? Bio,
    string? Photo,
    bool IsActive,
    Guid? TenantId = null
) : IRequest<DoctorDto>;

public record DeleteDoctorCommand(Guid Id) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetDoctorByIdQuery(Guid Id) : IRequest<DoctorDto>;
public record GetDoctorsQuery(string? Specialty, bool? IsActive) : IRequest<IEnumerable<DoctorDto>>;
