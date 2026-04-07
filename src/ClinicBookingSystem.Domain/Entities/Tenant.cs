namespace ClinicBookingSystem.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Subdomain { get; set; }
    public string? LogoUrl { get; set; }
    public string? ClinicImageUrl { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime SubscriptionExpiry { get; set; }

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();

    public ICollection<ClinicSubscription> Subscriptions { get; set; }
}
