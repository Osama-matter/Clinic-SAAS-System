using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
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
    private readonly ITenantProvider _tenantProvider;
    private readonly ILogger<ReminderJob> _logger;

    public ReminderJob(
        ApplicationDbContext context,
        IEmailService emailService,
        ITenantProvider tenantProvider,
        ILogger<ReminderJob> logger)
    {
        _context = context;
        _emailService = emailService;
        _tenantProvider = tenantProvider;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task SendRemindersAsync()
    {
        var now = DateTime.UtcNow;
        var in24h = now.AddHours(24);
        var in1h = now.AddHours(1);

        // Fetch upcoming appointments across tenants
        var upcomingAppointments = await _context.Appointments
            .IgnoreQueryFilters()
            .Include(a => a.User)
            .Include(a => a.Doctor)
            .Where(a => !a.IsDeleted
                && a.TenantId.HasValue
                && (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Pending)
                && a.SlotDateTime >= now && a.SlotDateTime <= in24h)
            .ToListAsync();

        if (!upcomingAppointments.Any()) return;

        foreach (var appt in upcomingAppointments)
        {
            var tenantId = appt.TenantId;
            if (!tenantId.HasValue || tenantId == Guid.Empty)
            {
                _logger.LogWarning("Skipping appointment {AppointmentId} with missing TenantId.", appt.Id);
                continue;
            }

            var email = appt.User?.Email ?? appt.PatientEmail;
            if (string.IsNullOrWhiteSpace(email)) continue;

            var send24h = (appt.SlotDateTime <= in24h && appt.SlotDateTime > now.AddHours(23));
            var send1h = (appt.SlotDateTime <= in1h);

            if (!send24h && !send1h) continue;

            var typeKey = send1h ? "1h" : "24h";
            var referenceKey = $"appt-reminder-{typeKey}-{appt.Id}";

            // Explicitly establish tenant context for tenant-scoped operations
            using (_tenantProvider.Change(tenantId))
            {
                // Idempotency check scoped strictly to the appointment's tenant
                var alreadySent = await _context.Notifications
                    .IgnoreQueryFilters()
                    .AnyAsync(n => !n.IsDeleted
                        && n.TenantId == tenantId.Value
                        && n.Message.Contains(referenceKey));

                if (alreadySent) continue;

                try
                {
                    var title = $"Appointment with Dr. {appt.Doctor?.Name ?? "Doctor"}";
                    var timeLabel = send1h ? "in 1 hour" : "in 24 hours";

                    await _emailService.SendReminderAsync(email, $"{title} ({timeLabel})", appt.SlotDateTime);

                    // Record notification with explicit TenantId to prevent duplicate side effects on retries
                    var notification = new Notification
                    {
                        TenantId = tenantId.Value,
                        UserId = appt.UserId,
                        Message = $"{referenceKey}: {title} - Ref: {appt.BookingReference}",
                        Type = NotificationType.Email,
                        SentAt = DateTime.UtcNow,
                        IsRead = true
                    };

                    _context.Notifications.Add(notification);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Appointment reminder ({Type}) sent for appointment {AppointmentId} in tenant {TenantId}",
                        typeKey, appt.Id, tenantId.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send appointment reminder for appointment {AppointmentId}", appt.Id);
                }
            }
        }
    }
}
