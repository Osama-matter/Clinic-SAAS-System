using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using Hangfire;

namespace ClinicBookingSystem.Infrastructure.Services;

public class AppointmentNotificationService : IAppointmentNotificationService
{
    private readonly IUnitOfWork _uow;

    public AppointmentNotificationService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task NotifyBookingCreatedAsync(
        PatientAppointment appointment, 
        Doctor doctor, 
        string patientName, 
        string? patientEmail, 
        CancellationToken cancellationToken = default)
    {
        var notificationMessage = $"New Booking: {patientName} with Dr. {doctor.Name} on {appointment.SlotDateTime:MMM dd, HH:mm}";

        var notificationsToAdd = new List<Notification>
        {
            new Notification
            {
                TenantId = doctor.TenantId,
                UserId = doctor.UserId,
                Message = notificationMessage,
                Type = NotificationType.InApp
            }
        };

        // Notify admins belonging strictly to the doctor's clinic (tenant)
        var admins = await _uow.Users.GetAllAsync(
            u => u.Role == UserRole.Admin && u.TenantId == doctor.TenantId, 
            cancellationToken);

        foreach (var admin in admins)
        {
            if (admin.Id != doctor.UserId)
            {
                notificationsToAdd.Add(new Notification
                {
                    TenantId = doctor.TenantId,
                    UserId = admin.Id,
                    Message = notificationMessage,
                    Type = NotificationType.InApp
                });
            }
        }

        foreach (var n in notificationsToAdd)
        {
            await _uow.Notifications.AddAsync(n, cancellationToken);
        }

        await _uow.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrEmpty(patientEmail))
        {
            BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                emailSvc.SendBookingConfirmationAsync(patientEmail, $"Appointment with Dr. {doctor.Name}", appointment.SlotDateTime, CancellationToken.None));
        }
    }
}
