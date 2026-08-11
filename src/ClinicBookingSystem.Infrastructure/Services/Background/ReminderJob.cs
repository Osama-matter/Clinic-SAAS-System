using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClinicBookingSystem.Infrastructure.Services.Background;

public class ReminderJob
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<ReminderJob> _logger;

    public ReminderJob(ApplicationDbContext context, IEmailService emailService, ILogger<ReminderJob> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task SendRemindersAsync()
    {
        var now = DateTime.UtcNow;
        var in24h = now.AddHours(24);
        var in1h = now.AddHours(1);

        // ── Appointment-based reminders (doctor appointments) ──
        var upcomingAppointments = await _context.Appointments
            .IgnoreQueryFilters()
            .Include(a => a.User)
            .Include(a => a.Doctor)
            .Where(a => !a.IsDeleted
                && (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Pending)
                && a.SlotDateTime >= now && a.SlotDateTime <= in24h)
            .ToListAsync();

        foreach (var appt in upcomingAppointments)
        {
            var email = appt.User?.Email ?? appt.PatientEmail;
            if (string.IsNullOrEmpty(email)) continue;

            bool send24h = (appt.SlotDateTime <= in24h && appt.SlotDateTime > now.AddHours(23));
            bool send1h = (appt.SlotDateTime <= in1h);

            if (!send24h && !send1h) continue;

            var typeKey = send1h ? "1h" : "24h";
            var referenceKey = $"appt-reminder-{typeKey}-{appt.Id}";
            
            var alreadySent = await _context.Notifications
                .IgnoreQueryFilters()
                .AnyAsync(n => !n.IsDeleted && n.Message.Contains(referenceKey));

            if (alreadySent) continue;

            try
            {
                var title = $"Appointment with Dr. {appt.Doctor.Name}";
                var timeLabel = send1h ? "in 1 hour" : "in 24 hours";

                await _emailService.SendReminderAsync(email, $"{title} ({timeLabel})", appt.SlotDateTime);

                // Record notification to prevent duplicate
                var notification = new Domain.Entities.Notification
                {
                    UserId = appt.UserId ?? Guid.Empty, // Use Empty if guest, but we mostly track via Message content for reminders
                    Message = $"{referenceKey}: {title} - Ref: {appt.BookingReference}",
                    Type = NotificationType.Email
                };

                // For guest users, we still want to record the notification to prevent duplicates
                // Note: The Domain Entity might require a valid UserId if not nullable.
                // Let's check SupportEntities.cs again.
                
                _context.Notifications.Add(notification);

                _logger.LogInformation("Appointment reminder ({Type}) sent to {Email} for appointment {AppointmentId}",
                    typeKey, email, appt.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send appointment reminder to {Email}", email);
            }
        }

        await _context.SaveChangesAsync();
    }
}
