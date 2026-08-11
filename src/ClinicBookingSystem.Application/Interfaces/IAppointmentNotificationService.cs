using ClinicBookingSystem.Domain.Entities;

namespace ClinicBookingSystem.Application.Interfaces;

public interface IAppointmentNotificationService
{
    Task NotifyBookingCreatedAsync(PatientAppointment appointment, Doctor doctor, string patientName, string? patientEmail, CancellationToken cancellationToken = default);
}
