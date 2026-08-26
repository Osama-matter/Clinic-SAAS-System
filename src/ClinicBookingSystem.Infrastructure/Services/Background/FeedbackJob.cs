using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClinicBookingSystem.Infrastructure.Services.Background;

public class FeedbackJob
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ITenantProvider _tenantProvider;
    private readonly ILogger<FeedbackJob> _logger;

    public FeedbackJob(
        ApplicationDbContext context,
        IEmailService emailService,
        ITenantProvider tenantProvider,
        ILogger<FeedbackJob> logger)
    {
        _context = context;
        _emailService = emailService;
        _tenantProvider = tenantProvider;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task SendFeedbackRequestsAsync()
    {
        var now = DateTime.UtcNow;
        var past24h = now.AddHours(-24);

        // Find completed appointments across tenants
        var completedAppointments = await _context.Appointments
            .IgnoreQueryFilters()
            .Include(a => a.User)
            .Include(a => a.Doctor)
            .Where(a => !a.IsDeleted
                && a.TenantId.HasValue
                && a.Status == AppointmentStatus.Completed
                && a.UpdatedAt >= past24h)
            .ToListAsync();

        if (!completedAppointments.Any()) return;

        foreach (var appt in completedAppointments)
        {
            var tenantId = appt.TenantId;
            if (!tenantId.HasValue || tenantId == Guid.Empty)
            {
                _logger.LogWarning("Skipping completed appointment {AppointmentId} with missing TenantId.", appt.Id);
                continue;
            }

            var email = appt.User?.Email ?? appt.PatientEmail;
            if (string.IsNullOrWhiteSpace(email)) continue;

            var referenceKey = $"Feedback-{appt.Id}";

            // Explicitly establish tenant context
            using (_tenantProvider.Change(tenantId))
            {
                // Scoped idempotency check
                var alreadySent = await _context.Notifications
                    .IgnoreQueryFilters()
                    .AnyAsync(n => !n.IsDeleted
                        && n.TenantId == tenantId.Value
                        && n.Message.Contains(referenceKey));

                if (alreadySent) continue;

                try
                {
                    var doctorName = appt.Doctor?.Name ?? "your doctor";
                    var subject = $"How was your visit with Dr. {doctorName}?";
                    var body = $@"
                        <h3>We'd love to hear your feedback!</h3>
                        <p>Dear {appt.PatientName ?? appt.User?.Name ?? "Patient"},</p>
                        <p>Thank you for visiting <strong>Dr. {doctorName}</strong> on {appt.SlotDateTime:MMM dd, yyyy}.</p>
                        <p>Please take a moment to rate your experience.</p>
                        <br/>
                        <p>Best regards,<br/>Clinic Team</p>
                    ";

                    await _emailService.SendAsync(email, subject, body);

                    var notification = new Notification
                    {
                        TenantId = tenantId.Value,
                        UserId = appt.UserId,
                        Message = $"{referenceKey} Request Sent",
                        Type = NotificationType.Email,
                        SentAt = DateTime.UtcNow,
                        IsRead = true
                    };

                    _context.Notifications.Add(notification);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Feedback request sent for appointment {AppointmentId} in tenant {TenantId}",
                        appt.Id, tenantId.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send feedback request email for Appointment {Id}", appt.Id);
                }
            }
        }
    }
}
