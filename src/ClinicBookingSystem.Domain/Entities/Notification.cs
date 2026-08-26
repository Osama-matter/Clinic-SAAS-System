using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Domain.Entities;

public class Notification : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public NotificationType Type { get; set; }
    public bool IsRead { get; set; } = false;

    // Navigation
    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
}
