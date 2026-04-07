using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Features.Appointments;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Features.Doctors;

// ── Commands ──────────────────────────────────────────
public record AddAppointmentNotesCommand(Guid AppointmentId, string Notes) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetMyDoctorScheduleQuery(Guid? DoctorId, DateTime? Date, Domain.Enums.AppointmentStatus? Status) : IRequest<IEnumerable<AppointmentDto>>;

// ── Handlers ──────────────────────────────────────────
public class GetMyDoctorScheduleQueryHandler : IRequestHandler<GetMyDoctorScheduleQuery, IEnumerable<AppointmentDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyDoctorScheduleQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<IEnumerable<AppointmentDto>> Handle(GetMyDoctorScheduleQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedActionException("Not authenticated.");

        // If user is Admin or Receptionist, show all appointments or filter by DoctorId if provided
        if (_currentUser.Role == "Admin" || _currentUser.Role == "Receptionist" || _currentUser.Role == "2" || _currentUser.Role == "3")
        {
            var clinicAppointments = await _uow.Appointments.GetAllAsync(
                a => (!request.DoctorId.HasValue || a.DoctorId == request.DoctorId.Value)
                    && (!request.Date.HasValue || a.SlotDateTime.Date == request.Date.Value.Date)
                    && (!request.Status.HasValue || a.Status == request.Status),
                cancellationToken,
                a => a.Doctor, a => a.User);

            return clinicAppointments.Select(a => new AppointmentDto(
                a.Id,
                a.DoctorId,
                a.Doctor?.Name ?? "Unknown Doctor",
                a.SlotDateTime,
                a.Status,
                a.BookingReference,
                a.Notes,
                a.User?.Name ?? a.PatientName ?? "System User",
                a.User?.PhoneNumber ?? a.PatientPhone ?? "No Phone",
                a.CreatedAt,
                a.IsPaid
            ));
        }

        // Existing doctor-only logic
        var user = await _uow.Users.GetByIdAsync(userId, cancellationToken, u => u.Doctor)
            ?? throw new UnauthorizedActionException("User account not found.");
            
        var doctor = user.Doctor
            ?? throw new DomainException("No doctor profile linked to this user account. If you are an Admin, please ensure your role is correctly set.");

        var appointments = await _uow.Appointments.GetAllAsync(
            a => a.DoctorId == doctor.Id
                && (!request.Date.HasValue || a.SlotDateTime.Date == request.Date.Value.Date)
                && (!request.Status.HasValue || a.Status == request.Status),
            cancellationToken,
            a => a.Doctor, a => a.User);

        return appointments.Select(a => new AppointmentDto(
            a.Id,
            a.DoctorId,
            a.Doctor.Name,
            a.SlotDateTime,
            a.Status,
            a.BookingReference,
            a.Notes,
            a.User?.Name ?? a.PatientName ?? "System User",
            a.User?.PhoneNumber ?? a.PatientPhone ?? "No Phone",
            a.CreatedAt,
            a.IsPaid
        ));
    }
}

public class AddAppointmentNotesCommandHandler : IRequestHandler<AddAppointmentNotesCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public AddAppointmentNotesCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(AddAppointmentNotesCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedActionException("Not authenticated.");

        var appointment = await _uow.Appointments.GetByIdAsync(request.AppointmentId, cancellationToken, a => a.Doctor)
            ?? throw new NotFoundException(nameof(PatientAppointment), request.AppointmentId);

        // Verify permissions
        var user = await _uow.Users.GetByIdAsync(userId, cancellationToken, u => u.Doctor)
            ?? throw new UnauthorizedActionException("User account not found.");
            
        var doctor = user.Doctor;
        var isStaff = user.Role == UserRole.Admin || user.Role == UserRole.Receptionist;

        if (!isStaff && (doctor == null || appointment.DoctorId != doctor.Id))
            throw new UnauthorizedActionException("You can only add notes to your own appointments.");

        appointment.Notes = request.Notes;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(appointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
