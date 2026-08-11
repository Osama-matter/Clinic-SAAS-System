using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record BookAppointmentCommand(
    Guid DoctorId,
    DateTime SlotDateTime,
    string? Notes
) : IRequest<AppointmentDto>;

public class BookAppointmentCommandHandler : IRequestHandler<BookAppointmentCommand, AppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly ISaaSEnforcementService _saas;
    private readonly ISchedulingService _schedulingService;
    private readonly IAppointmentNotificationService _notificationService;

    public BookAppointmentCommandHandler(
        IUnitOfWork uow, 
        ICurrentUserService currentUser, 
        ISaaSEnforcementService saas,
        ISchedulingService schedulingService,
        IAppointmentNotificationService notificationService)
    {
        _uow = uow;
        _currentUser = currentUser;
        _saas = saas;
        _schedulingService = schedulingService;
        _notificationService = notificationService;
    }

    public async Task<AppointmentDto> Handle(BookAppointmentCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        var userId = _currentUser.UserId!.Value;

        // 1. Validate SaaS Limits
        var count = await _uow.Appointments.CountAsync(a => a.TenantId == doctor.TenantId, cancellationToken);
        await _saas.CheckLimitAsync(SaaSFeatureCodes.AppointmentsLimit, count, cancellationToken);

        // 2. Validate Slot Availability (Schedule, Blocked Slots, Existing Bookings)
        await _schedulingService.ValidateSlotAvailabilityAsync(doctor, request.SlotDateTime, currentUserId: userId, cancellationToken: cancellationToken);

        // 3. Create Domain Entity via Factory
        var appointment = PatientAppointment.Create(
            doctor.TenantId,
            doctor.Id,
            userId,
            request.SlotDateTime,
            request.Notes);

        await _uow.Appointments.AddAsync(appointment, cancellationToken);
        
        try
        {
            await _uow.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new SchedulingConflictException("This slot was just booked by another user. Please select a different time.");
        }

        // 4. Publish Notifications & Emails
        var patientName = _currentUser.Email ?? "Patient";
        await _notificationService.NotifyBookingCreatedAsync(
            appointment, doctor, patientName, _currentUser.Email, cancellationToken);

        return new AppointmentDto(
            appointment.Id,
            doctor.Id,
            doctor.Name,
            appointment.SlotDateTime,
            appointment.Status,
            appointment.BookingReference,
            appointment.Notes,
            patientName,
            "",
            appointment.CreatedAt,
            appointment.IsPaid);
    }
}
