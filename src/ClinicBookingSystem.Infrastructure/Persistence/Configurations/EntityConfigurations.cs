using ClinicBookingSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicBookingSystem.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Name).IsRequired().HasMaxLength(100);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(200);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.TenantId);
        builder.HasIndex(u => new { u.TenantId, u.Email });
        builder.HasIndex(u => new { u.TenantId, u.Role });
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.HasQueryFilter(u => !u.IsDeleted);
    }
}

public class PatientAppointmentConfiguration : IEntityTypeConfiguration<PatientAppointment>
{
    public void Configure(EntityTypeBuilder<PatientAppointment> builder)
    {
        builder.HasKey(a => a.Id);
        builder.HasOne(a => a.Doctor).WithMany(d => d.Appointments).HasForeignKey(a => a.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(a => a.User).WithMany(u => u.Appointments).HasForeignKey(a => a.UserId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        builder.Property(a => a.BookingReference).IsRequired().HasMaxLength(20);
        builder.HasIndex(a => a.BookingReference).IsUnique();
        builder.HasIndex(a => a.TenantId);
        builder.HasIndex(a => new { a.TenantId, a.DoctorId, a.SlotDateTime });
        builder.HasIndex(a => new { a.TenantId, a.Status, a.SlotDateTime });
        builder.HasIndex(a => new { a.TenantId, a.BookingReference });

        // Guest patient fields
        builder.Property(a => a.PatientName).HasMaxLength(100);
        builder.Property(a => a.PatientPhone).HasMaxLength(20);
        builder.Property(a => a.PatientEmail).HasMaxLength(200);

        builder.HasIndex(a => new { a.DoctorId, a.SlotDateTime })
            .HasFilter("[Status] != 2") // Status 2 is Cancelled
            .IsUnique();
    }
}

public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Name).IsRequired().HasMaxLength(100);
        builder.Property(d => d.Specialty).IsRequired().HasMaxLength(100);
        builder.HasIndex(d => d.TenantId);
        builder.HasIndex(d => d.UserId);
        builder.HasOne(d => d.User).WithOne(u => u.Doctor).HasForeignKey<Doctor>(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ScheduleConfiguration : IEntityTypeConfiguration<Schedule>
{
    public void Configure(EntityTypeBuilder<Schedule> builder)
    {
        builder.HasKey(s => s.Id);
        builder.HasOne(s => s.Doctor).WithMany(d => d.Schedules).HasForeignKey(s => s.DoctorId);
        builder.HasIndex(s => s.TenantId);
        builder.HasIndex(s => new { s.TenantId, s.DoctorId, s.DayOfWeek });
    }
}

public class BlockedSlotConfiguration : IEntityTypeConfiguration<BlockedSlot>
{
    public void Configure(EntityTypeBuilder<BlockedSlot> builder)
    {
        builder.HasKey(b => b.Id);
        builder.HasOne(b => b.Doctor).WithMany(d => d.BlockedSlots).HasForeignKey(b => b.DoctorId);
        builder.HasIndex(b => b.TenantId);
        builder.HasIndex(b => new { b.TenantId, b.DoctorId, b.StartTime, b.EndTime });
    }
}

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);
        builder.HasOne(n => n.User).WithMany(u => u.Notifications).HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(n => n.TenantId);
        builder.HasIndex(n => new { n.TenantId, n.UserId, n.IsRead });
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.HasQueryFilter(a => !a.IsDeleted);
    }
}

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(150);
        builder.Property(p => p.Price).HasColumnType("decimal(10,2)");
        builder.Property(p => p.IsActive).HasDefaultValue(true);
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasMany(p => p.ClinicSubscriptions)
               .WithOne(cs => cs.Plan)
               .HasForeignKey(cs => cs.PlanId);

        builder.HasMany(p => p.PlanFeatures)
               .WithOne(pf => pf.Plan)
               .HasForeignKey(pf => pf.PlanId);
    }
}

public class FeatureConfiguration : IEntityTypeConfiguration<Feature>
{
    public void Configure(EntityTypeBuilder<Feature> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Name).IsRequired().HasMaxLength(150);
        builder.Property(f => f.Code).IsRequired().HasMaxLength(50);

        builder.HasMany(f => f.PlanFeatures)
               .WithOne(pf => pf.Feature)
               .HasForeignKey(pf => pf.FeatureId);
    }
}

public class PlanFeatureConfiguration : IEntityTypeConfiguration<PlanFeature>
{
    public void Configure(EntityTypeBuilder<PlanFeature> builder)
    {
        builder.HasKey(pf => new { pf.PlanId, pf.FeatureId });
        builder.Property(pf => pf.IsEnabled).HasDefaultValue(true);
        builder.Property(pf => pf.LimitValue);
    }
}

public class ClinicConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired().HasMaxLength(150);
        builder.Property(c => c.Subdomain).HasMaxLength(120);
        builder.HasIndex(c => c.Subdomain).IsUnique();
        builder.Property(c => c.LogoUrl);
        builder.Property(c => c.ClinicImageUrl);
        builder.Property(c => c.Address).HasMaxLength(300);
        builder.Property(c => c.PhoneNumber).HasMaxLength(30);
        builder.Property(c => c.PrimaryColor).HasMaxLength(32);
        builder.Property(c => c.DoctorName).HasMaxLength(150);
        builder.Property(c => c.Specialty).HasMaxLength(150);
        builder.Property(c => c.Description).HasMaxLength(2000);
        builder.Property(c => c.DoctorImageUrl);
        builder.Property(c => c.WorkingHours).HasMaxLength(1000);
        builder.Property(c => c.Services).HasMaxLength(4000);
        builder.Property(c => c.IsPublicPageEnabled).HasDefaultValue(true);
        builder.Property(c => c.IsActive).HasDefaultValue(true);
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasMany(c => c.Subscriptions)
               .WithOne(cs => cs.Clinic)
               .HasForeignKey(cs => cs.ClinicId);
    }
}

public class ClinicSubscriptionConfiguration : IEntityTypeConfiguration<ClinicSubscription>
{
    public void Configure(EntityTypeBuilder<ClinicSubscription> builder)
    {
        builder.ToTable("ClinicSubscriptions");
        builder.HasKey(cs => cs.Id);
        builder.Property(cs => cs.PaymentRef).IsRequired(false);
        builder.Property(cs => cs.PaidAmount).HasColumnType("decimal(10,2)");
        builder.Property(cs => cs.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(cs => cs.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(cs => cs.Clinic)
               .WithMany(c => c.Subscriptions)
               .HasForeignKey(cs => cs.ClinicId);

        builder.HasOne(cs => cs.Plan)
               .WithMany(p => p.ClinicSubscriptions)
               .HasForeignKey(cs => cs.PlanId);
    }
}

public class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.HasKey(pt => pt.Id);
        builder.Property(pt => pt.Amount).HasColumnType("decimal(18,2)");
        builder.HasOne(pt => pt.Subscription)
               .WithMany()
               .HasForeignKey(pt => pt.SubscriptionId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
