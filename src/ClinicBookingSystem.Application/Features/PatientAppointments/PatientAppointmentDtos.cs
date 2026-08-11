using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record AppointmentDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    string BookingReference,
    string? Notes,
    string PatientName,
    string PatientPhone,
    DateTime CreatedAt,
    bool IsPaid = false
);

public record PublicAppointmentDto(
    Guid Id,
    Guid DoctorId,
    string BookingReference,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    DateTime CreatedAt,
    bool IsPaid = false
);

public record PublicAppointmentSearchDto(
    Guid Id,
    string BookingReference,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    DateTime CreatedAt,
    string PatientName,
    string PatientPhone,
    bool IsPaid = false
);

public record NotesRequest(string Notes);
