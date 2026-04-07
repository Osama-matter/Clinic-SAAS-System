namespace ClinicBookingSystem.Infrastructure.Settings;

public class EmailSettings
{
    public string Host { get; set; } = default!;
    public int Port { get; set; }
    public string From { get; set; } = default!;
    public string FromName { get; set; } = string.Empty;
    public string Username { get; set; } = default!;
    public string Password { get; set; } = default!;
}