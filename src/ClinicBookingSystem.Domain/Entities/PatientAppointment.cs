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

    // ── Factory Methods ──────────────────────────────────────
    public static PatientAppointment Create(
        Guid? tenantId,
        Guid doctorId,
        Guid userId,
        DateTime slotDateTime,
        string? notes)
    {
        return new PatientAppointment
        {
            TenantId = tenantId,
            DoctorId = doctorId,
            UserId = userId,
            SlotDateTime = slotDateTime,
            Status = AppointmentStatus.Pending,
            BookingReference = GenerateBookingReference(),
            Notes = notes
        };
    }

    public static PatientAppointment CreatePublic(
        Guid? tenantId,
        Guid doctorId,
        string patientName,
        string patientPhone,
        string patientEmail,
        DateTime slotDateTime,
        string? notes)
    {
        return new PatientAppointment
        {
            TenantId = tenantId,
            DoctorId = doctorId,
            PatientName = patientName,
            PatientPhone = patientPhone,
            PatientEmail = patientEmail,
            SlotDateTime = slotDateTime,
            Status = AppointmentStatus.Pending,
            BookingReference = GenerateBookingReference(),
            Notes = notes
        };
    }

    private static string GenerateBookingReference()
        => Guid.NewGuid().ToString("N")[..12].ToUpper();

    // ── Domain Logic & State Transitions ─────────────────────
    public void Confirm()
    {
        Status = AppointmentStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = AppointmentStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reschedule(DateTime newSlotDateTime)
    {
        SlotDateTime = newSlotDateTime;
        Status = AppointmentStatus.Rescheduled;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        Status = AppointmentStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }
}
