using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Infrastructure.Settings;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace ClinicBookingSystem.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string to,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(_settings.FromName, _settings.From));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();

            await client.ConnectAsync(
                _settings.Host,
                _settings.Port,
                SecureSocketOptions.StartTls,
                cancellationToken);

            await client.AuthenticateAsync(
                _settings.Username,
                _settings.Password,
                cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Email sent successfully to {To}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }

    public Task SendBookingConfirmationAsync(
        string to,
        string doctorName,
        DateTime slotDate,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Appointment Confirmed with Dr. {doctorName}";
        var body = $"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #2E86C1;">Your Appointment is Confirmed!</h2>
                <p>Dear Patient,</p>
                <p>Your appointment has been successfully booked.</p>
                <table style="border-collapse: collapse; margin-top: 12px;">
                    <tr>
                        <td style="padding: 6px 12px; font-weight: bold;">Doctor</td>
                        <td style="padding: 6px 12px;">Dr. {doctorName}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="padding: 6px 12px; font-weight: bold;">Date & Time</td>
                        <td style="padding: 6px 12px;">{slotDate:dddd, MMMM d yyyy — HH:mm}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; color: #888; font-size: 13px;">
                    Please arrive 10 minutes before your scheduled time.
                </p>
            </body>
            </html>
            """;

        return SendAsync(to, subject, body, cancellationToken);
    }

    public Task SendReminderAsync(
        string to,
        string title,
        DateTime date,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Reminder: {title} is coming up!";
        var body = $"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #E67E22;">Appointment Reminder</h2>
                <p>Dear Patient,</p>
                <p>This is a friendly reminder about your upcoming appointment.</p>
                <table style="border-collapse: collapse; margin-top: 12px;">
                    <tr>
                        <td style="padding: 6px 12px; font-weight: bold;">Appointment</td>
                        <td style="padding: 6px 12px;">{title}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="padding: 6px 12px; font-weight: bold;">Date & Time</td>
                        <td style="padding: 6px 12px;">{date:dddd, MMMM d yyyy — HH:mm}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; color: #888; font-size: 13px;">
                    If you need to reschedule, please contact us as soon as possible.
                </p>
            </body>
            </html>
            """;

        return SendAsync(to, subject, body, cancellationToken);
    }
}