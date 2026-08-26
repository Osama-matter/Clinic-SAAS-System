namespace ClinicBookingSystem.Infrastructure.Settings;

public class SeedDataOptions
{
    public const string SectionName = "SeedData";

    public string SuperAdminEmail { get; set; } = "admin@clinic.com";
    public string SuperAdminPassword { get; set; } = "Admin123!";
    public string StaffEmail { get; set; } = "staff@clinic.com";
    public string StaffPassword { get; set; } = "Staff123!";
}
