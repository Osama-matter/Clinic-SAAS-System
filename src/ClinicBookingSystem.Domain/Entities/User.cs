using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Domain.Entities;

public class User : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty; 
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public string? PhoneNumber { get; set; }
    public bool SmsNotificationsEnabled { get; set; } = false;

    // Account Lockout / Brute-force protection
    public int AccessFailedCount { get; set; } = 0;
    public DateTime? LockoutEnd { get; set; }
    public bool LockoutEnabled { get; set; } = true;
    public bool IsLockedOut => LockoutEnabled && LockoutEnd.HasValue && LockoutEnd.Value > DateTime.UtcNow;

    public Guid? DoctorId { get; set; }


    // Navigation
    public Tenant? Tenant { get; set; }
    public ICollection<PatientAppointment> Appointments { get; set; } = new List<PatientAppointment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public Doctor? Doctor { get; set; }
}
