using ClinicBookingSystem.Application.Interfaces;
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
    private readonly ILogger<FeedbackJob> _logger;

    public FeedbackJob(ApplicationDbContext context, IEmailService emailService, ILogger<FeedbackJob> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task SendFeedbackRequestsAsync()
    {
        var now = DateTime.UtcNow;
        var past24h = now.AddHours(-24);

        // Find appointments marked as Completed within the last 24 hours that haven't received a feedback email yet
        var completedAppointments = await _context.Appointments
            .IgnoreQueryFilters()
            .Include(a => a.User)
            .Include(a => a.Doctor)
            .Where(a => !a.IsDeleted
                && a.Status == AppointmentStatus.Completed
                && a.UpdatedAt >= past24h)
            .ToListAsync();

        foreach (var appt in completedAppointments)
        {
            var email = appt.User?.Email ?? appt.PatientEmail;
            if (string.IsNullOrEmpty(email)) continue;

            // Check if we already sent a feedback request for this appointment
            var alreadySent = await _context.Notifications
                .IgnoreQueryFilters()
                .AnyAsync(n => !n.IsDeleted
                    && n.UserId == (appt.UserId ?? Guid.Empty)
                    && n.Message.Contains($"Feedback-{appt.Id}"));

            if (alreadySent) continue;

            try
            {
                var subject = $"How was your visit with Dr. {appt.Doctor.Name}?";
                var body = $@"
                    <h3>We'd love to hear your feedback!</h3>
                    <p>Dear {appt.PatientName ?? appt.User?.Name ?? "Patient"},</p>
                    <p>Thank you for visiting <strong>Dr. {appt.Doctor.Name}</strong> on {appt.SlotDateTime:MMM dd, yyyy}.</p>
                    <p>Please take a moment to <a href=""https://clinicflow.test/feedback/{appt.Id}"">rate your experience</a>.</p>
                    <br/>
                    <p>Best regards,<br/>The ClinicFlow Team</p>
                ";

                await _emailService.SendAsync(email, subject, body);

                if (appt.UserId.HasValue)
                {
                    _context.Notifications.Add(new Domain.Entities.Notification
                    {
                        UserId = appt.UserId.Value,
                        Message = $"Feedback-{appt.Id} Request Sent",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = true
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send feedback request email to {Email} for Appointment {Id}", email, appt.Id);
            }
        }

        await _context.SaveChangesAsync();
    }
}
