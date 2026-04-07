using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClinicBookingSystem.Infrastructure.Services.Background;

public class AppointmentCleanupJob
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentCleanupJob> _logger;

    public AppointmentCleanupJob(ApplicationDbContext context, ILogger<AppointmentCleanupJob> logger)
    {
        _context = context;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task CleanupExpiredAppointmentsAsync()
    {
        var now = DateTime.UtcNow;

        // Find Pending or Confirmed appointments that are in the past (e.g., 1 hour past slot time)
        var expiredAppointments = await _context.Appointments
            .Where(a => (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)
                && a.SlotDateTime < now.AddHours(-1))
            .ToListAsync();

        if (!expiredAppointments.Any()) return;

        _logger.LogInformation("Found {Count} expired appointments to clean up.", expiredAppointments.Count);

        foreach (var appt in expiredAppointments)
        {
            // If it was Confirmed but time passed, mark as NoShow
            // If it was Pending and time passed, mark as Cancelled
            if (appt.Status == AppointmentStatus.Confirmed)
            {
                appt.Status = AppointmentStatus.NoShow;
            }
            else
            {
                appt.Status = AppointmentStatus.Cancelled;
            }

            appt.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Successfully cleaned up {Count} appointments.", expiredAppointments.Count);
    }
}
