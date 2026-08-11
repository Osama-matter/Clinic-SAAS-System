using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record PublicBookAppointmentCommand(
    string PatientName,
    string PatientPhone,
    string PatientEmail,
    Guid DoctorId,
    DateTime SlotDateTime,
    string? Notes
) : IRequest<PublicAppointmentDto>;

public class PublicBookAppointmentCommandHandler : IRequestHandler<PublicBookAppointmentCommand, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ISaaSEnforcementService _saas;
    private readonly ISchedulingService _schedulingService;
    private readonly IAppointmentNotificationService _notificationService;

    public PublicBookAppointmentCommandHandler(
        IUnitOfWork uow, 
        ISaaSEnforcementService saas,
        ISchedulingService schedulingService,
        IAppointmentNotificationService notificationService)
    {
        _uow = uow;
        _saas = saas;
        _schedulingService = schedulingService;
        _notificationService = notificationService;
    }

    public async Task<PublicAppointmentDto> Handle(PublicBookAppointmentCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        // 1. Validate SaaS Feature & Limits
        await _saas.CheckFeatureEnabledAsync(SaaSFeatureCodes.OnlineBooking, cancellationToken);
        var count = await _uow.Appointments.CountAsync(a => a.TenantId == doctor.TenantId, cancellationToken);
        await _saas.CheckLimitAsync(SaaSFeatureCodes.AppointmentsLimit, count, cancellationToken);

        // 2. Validate Slot Availability (Schedule, Blocked Slots, Existing Bookings)
        await _schedulingService.ValidateSlotAvailabilityAsync(doctor, request.SlotDateTime, cancellationToken: cancellationToken);

        // 3. Create Domain Entity via Factory
        var appointment = PatientAppointment.CreatePublic(
            doctor.TenantId,
            doctor.Id,
            request.PatientName,
            request.PatientPhone,
            request.PatientEmail,
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
        await _notificationService.NotifyBookingCreatedAsync(
            appointment, doctor, request.PatientName, request.PatientEmail, cancellationToken);

        return new PublicAppointmentDto(
            appointment.Id,
            doctor.Id,
            appointment.BookingReference,
            doctor.Name,
            appointment.SlotDateTime,
            appointment.Status,
            appointment.CreatedAt,
            appointment.IsPaid);
    }
}
