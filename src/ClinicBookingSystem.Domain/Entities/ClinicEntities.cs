namespace ClinicBookingSystem.Domain.Entities;

public class Doctor : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? Photo { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid UserId { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<BlockedSlot> BlockedSlots { get; set; } = new List<BlockedSlot>();
    public ICollection<PatientAppointment> Appointments { get; set; } = new List<PatientAppointment>();
    public User User { get; set; } = null!;
}

public class Schedule : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid DoctorId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int SlotDurationMinutes { get; set; } = 30;

    // Navigation
    public Tenant? Tenant { get; set; }
    public Doctor Doctor { get; set; } = null!;
}

public class BlockedSlot : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid DoctorId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Reason { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Doctor Doctor { get; set; } = null!;
}
