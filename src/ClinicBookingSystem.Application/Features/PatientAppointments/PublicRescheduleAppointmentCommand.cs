using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using Hangfire;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record PublicRescheduleAppointmentCommand(
    string BookingReference,
    string Phone,
    DateTime NewSlotDateTime,
    Guid? TenantId = null
) : IRequest<PublicAppointmentDto>;

public class PublicRescheduleAppointmentCommandHandler : IRequestHandler<PublicRescheduleAppointmentCommand, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _emailService;
    private readonly ITenantProvider _tenantProvider;

    public PublicRescheduleAppointmentCommandHandler(IUnitOfWork uow, IEmailService emailService, ITenantProvider tenantProvider)
    {
        _uow = uow;
        _emailService = emailService;
        _tenantProvider = tenantProvider;
    }

    public async Task<PublicAppointmentDto> Handle(PublicRescheduleAppointmentCommand request, CancellationToken cancellationToken)
    {
        var tenantId = request.TenantId ?? _tenantProvider.TenantId;
        if (!tenantId.HasValue)
            throw new DomainException("Tenant ID is required to reschedule an appointment.");

        var appointments = await _uow.Appointments.GetAllAsync(
            a => a.TenantId == tenantId.Value && a.BookingReference == request.BookingReference,
            cancellationToken,
            a => a.Doctor);

        var appointment = appointments.FirstOrDefault()
            ?? throw new NotFoundException("Appointment", request.BookingReference);

        // Verify phone
        var phone = appointment.User?.PhoneNumber ?? appointment.PatientPhone;
        if (!string.Equals(phone, request.Phone, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedActionException("Phone number does not match the booking.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new DomainException("Cannot reschedule a cancelled appointment.");

        if (request.NewSlotDateTime < DateTime.UtcNow)
            throw new DomainException("Cannot reschedule an appointment to a time in the past.");

        // Check new slot availability
        if (await _uow.BlockedSlots
            .AsQueryable()
            .IgnoreQueryFilters()
            .AnyAsync(
                b => !b.IsDeleted && b.DoctorId == appointment.DoctorId && request.NewSlotDateTime >= b.StartTime && request.NewSlotDateTime < b.EndTime,
                cancellationToken))
            throw new SchedulingConflictException("The new time slot is blocked.");

        if (await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .AnyAsync(
                a => !a.IsDeleted && a.DoctorId == appointment.DoctorId && a.SlotDateTime == request.NewSlotDateTime
                    && a.Status != AppointmentStatus.Cancelled && a.Id != appointment.Id,
                cancellationToken))
            throw new SchedulingConflictException("The new slot is already booked.");

        // Store old slot for logging/notification if needed
        var oldSlot = appointment.SlotDateTime;
        
        appointment.SlotDateTime = request.NewSlotDateTime;
        appointment.Status = AppointmentStatus.Rescheduled;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(appointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // ── Notifications ─────────────────────────────────
        var notificationMessage = $"Rescheduled Appointment: {appointment.PatientName ?? appointment.User?.Name ?? "Patient"} with Dr. {appointment.Doctor.Name} on {appointment.SlotDateTime:MMM dd, HH:mm}";

        // 1. Notify Doctor (InApp)
        await _uow.Notifications.AddAsync(new Notification
        {
            TenantId = appointment.TenantId,
            UserId = appointment.Doctor.UserId,
            Message = notificationMessage,
            Type = NotificationType.InApp
        }, cancellationToken);

        // 2. Notify Patient (Email)
        var patientEmail = appointment.User?.Email ?? appointment.PatientEmail;
        if (!string.IsNullOrEmpty(patientEmail))
        {
            BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                emailSvc.SendAsync(
                    patientEmail, 
                    "Appointment Rescheduled", 
                    $"<h2>Your appointment has been rescheduled</h2><p><strong>Dr. {appointment.Doctor.Name}</strong><br/>New Time: {appointment.SlotDateTime:dddd, MMMM d yyyy HH:mm}<br/>(Old Time: {oldSlot:MMM dd, HH:mm})</p>",
                    CancellationToken.None));
        }

        await _uow.SaveChangesAsync(cancellationToken);

        return new PublicAppointmentDto(
            appointment.Id,
            appointment.DoctorId,
            appointment.BookingReference,
            appointment.Doctor.Name,
            appointment.SlotDateTime,
            appointment.Status,
            appointment.CreatedAt,
            appointment.IsPaid);
    }
}
