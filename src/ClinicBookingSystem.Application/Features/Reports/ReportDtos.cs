using MediatR;

namespace ClinicBookingSystem.Application.Features.Reports;

// ── DTOs ──────────────────────────────────────────────
// ── Queries ───────────────────────────────────────────
public record GetAttendanceSummaryQuery(DateTime? From, DateTime? To) : IRequest<AttendanceReportSummaryDto>;

public record AttendanceReportSummaryDto(
    int TotalAppointments,
    int ConfirmedAppointments,
    int CompletedAppointments,
    int NoShowAppointments
);


public record ExportReportQuery(string Format, DateTime? From, DateTime? To) : IRequest<(byte[] Data, string ContentType, string FileName)>;

