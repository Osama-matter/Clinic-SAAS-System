using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Application.Interfaces;
using MediatR;
using ClinicBookingSystem.Domain.Enums;
using System;
using System.Linq;
using System.Linq.Expressions;

namespace ClinicBookingSystem.Application.Features.Reports;

public class GetAttendanceSummaryQueryHandler : IRequestHandler<GetAttendanceSummaryQuery, AttendanceReportSummaryDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUserService;

    public GetAttendanceSummaryQueryHandler(IUnitOfWork uow, ICurrentUserService currentUserService)
    {
        _uow = uow;
        _currentUserService = currentUserService;
    }

    public async Task<AttendanceReportSummaryDto> Handle(GetAttendanceSummaryQuery request, CancellationToken cancellationToken)
    {
        var role = _currentUserService.Role;
        var userId = _currentUserService.UserId;

        System.Linq.Expressions.Expression<System.Func<ClinicBookingSystem.Domain.Entities.PatientAppointment, bool>> filter = 
            a => (!request.From.HasValue || a.SlotDateTime >= request.From) &&
                 (!request.To.HasValue || a.SlotDateTime <= request.To);

        if (role == "Doctor" || role == "4")
        {
            var doctors = await _uow.Doctors.GetAllAsync(d => d.UserId == userId, cancellationToken);
            var doctor = doctors.FirstOrDefault();
            if (doctor != null)
            {
                var doctorId = doctor.Id;
                // Add doctor filter to existing filter
                var originalFilter = filter;
                filter = a => (!request.From.HasValue || a.SlotDateTime >= request.From) &&
                             (!request.To.HasValue || a.SlotDateTime <= request.To) &&
                             a.DoctorId == doctorId;
            }
        }

        var appointments = await _uow.Appointments.GetAllAsync(filter, cancellationToken);
        
        var allAppointments = appointments.ToList();
        var totalAppointments = allAppointments.Count;
        var confirmedAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.Confirmed);
        var completedAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.Completed);
        var noShowAppointments = allAppointments.Count(a => a.Status == AppointmentStatus.NoShow);

        return new AttendanceReportSummaryDto(
            totalAppointments, confirmedAppointments, completedAppointments, noShowAppointments);
    }
}

public class ExportReportQueryHandler : IRequestHandler<ExportReportQuery, (byte[] Data, string ContentType, string FileName)>
{
    private readonly IReportExportService _exportService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUnitOfWork _uow;

    public ExportReportQueryHandler(IReportExportService exportService, ICurrentUserService currentUserService, IUnitOfWork uow)
    {
        _exportService = exportService;
        _currentUserService = currentUserService;
        _uow = uow;
    }

    public async Task<(byte[] Data, string ContentType, string FileName)> Handle(ExportReportQuery request, CancellationToken cancellationToken)
    {
        var format = request.Format?.ToLower() ?? "csv";
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");

        Guid? doctorId = null;
        var role = _currentUserService.Role;
        if (role == "Doctor" || role == "4")
        {
            var doctors = await _uow.Doctors.GetAllAsync(d => d.UserId == _currentUserService.UserId, cancellationToken);
            var doctor = doctors.FirstOrDefault();
            doctorId = doctor?.Id;
        }

        return format switch
        {
            "pdf" => (
                await _exportService.ExportAppointmentsPdfAsync(request.From, request.To, doctorId, cancellationToken),
                "application/pdf",
                $"appointments_report_{timestamp}.pdf"
            ),
            _ => (
                await _exportService.ExportAppointmentsCsvAsync(request.From, request.To, doctorId, cancellationToken),
                "text/csv",
                $"appointments_report_{timestamp}.csv"
            )
        };
    }
}

