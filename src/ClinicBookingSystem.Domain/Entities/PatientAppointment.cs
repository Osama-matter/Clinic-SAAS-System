using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Domain.Entities;

public class PatientAppointment : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? UserId { get; set; }
    public DateTime SlotDateTime { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public string BookingReference { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public bool IsPaid { get; set; } = false;

    // Guest patient fields (for booking without login)
    public string? PatientName { get; set; }
    public string? PatientPhone { get; set; }
    public string? PatientEmail { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public User? User { get; set; }
}
