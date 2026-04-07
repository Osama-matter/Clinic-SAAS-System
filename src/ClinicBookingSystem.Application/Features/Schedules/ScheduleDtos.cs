using ClinicBookingSystem.Domain.Enums;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Schedules;

// ── DTOs ──────────────────────────────────────────────
public record ScheduleDto(
    Guid Id,
    Guid DoctorId,
    ClinicBookingSystem.Domain.Enums.DayOfWeek DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int SlotDurationMinutes
);

// ── Commands ──────────────────────────────────────────
public record CreateScheduleCommand(
    Guid DoctorId,
    ClinicBookingSystem.Domain.Enums.DayOfWeek DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int SlotDurationMinutes
) : IRequest<ScheduleDto>;

public record UpdateScheduleCommand(
    Guid Id,
    ClinicBookingSystem.Domain.Enums.DayOfWeek DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int SlotDurationMinutes
) : IRequest<ScheduleDto>;

public record DeleteScheduleCommand(Guid Id) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetDoctorSchedulesQuery(Guid DoctorId) : IRequest<IEnumerable<ScheduleDto>>;
