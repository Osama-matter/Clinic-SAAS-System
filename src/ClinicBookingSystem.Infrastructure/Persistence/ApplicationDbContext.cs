using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace ClinicBookingSystem.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantProvider tenantProvider) 
        : base(options) 
    {
        _tenantProvider = tenantProvider;
    }

    public Guid? CurrentTenantId => _tenantProvider.TenantId;
    public UserRole? CurrentUserRole => _tenantProvider.Role;

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Doctor> Doctors { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<PatientAppointment> Appointments { get; set; }
    public DbSet<Schedule> Schedules { get; set; }
    public DbSet<BlockedSlot> BlockedSlots { get; set; }
    public DbSet<Visit> Visits { get; set; }
    public DbSet<Drug> Drugs { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Plan> Plans { get; set; }
    public DbSet<Feature> Features { get; set; }
    public DbSet<PlanFeature> PlanFeature { get; set; }
    public DbSet<ClinicSubscription> ClinicSubscriptions { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<PendingOnboarding> PendingOnboardings { get; set; }
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; }

    // Medical details
    public DbSet<Vitals> Vitals { get; set; }
    public DbSet<Examination> Examinations { get; set; }
    public DbSet<Diagnosis> Diagnoses { get; set; }
    public DbSet<Prescription> Prescriptions { get; set; }
    public DbSet<LabOrder> LabOrders { get; set; }
    public DbSet<ImagingOrder> ImagingOrders { get; set; }
    public DbSet<Result> Results { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        var applyTenantAndSoftDeleteFilterMethod = GetType()
            .GetMethod(nameof(ApplyTenantAndSoftDeleteFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var applyTenantOnlyFilterMethod = GetType()
            .GetMethod(nameof(ApplyTenantOnlyFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var applySoftDeleteOnlyFilterMethod = GetType()
            .GetMethod(nameof(ApplySoftDeleteOnlyFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            var isTenantEntity = typeof(ITenantEntity).IsAssignableFrom(clrType);
            var isSoftDelete = typeof(ISoftDelete).IsAssignableFrom(clrType);

            if (isTenantEntity && isSoftDelete)
            {
                applyTenantAndSoftDeleteFilterMethod!.MakeGenericMethod(clrType).Invoke(this, new object[] { modelBuilder });
            }
            else if (isTenantEntity)
            {
                applyTenantOnlyFilterMethod!.MakeGenericMethod(clrType).Invoke(this, new object[] { modelBuilder });
            }
            else if (isSoftDelete)
            {
                applySoftDeleteOnlyFilterMethod!.MakeGenericMethod(clrType).Invoke(this, new object[] { modelBuilder });
            }
        }
    }

    private void ApplyTenantAndSoftDeleteFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity, ISoftDelete
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => 
            !e.IsDeleted && 
            (CurrentUserRole == UserRole.SuperAdmin || (CurrentTenantId != null && e.TenantId == CurrentTenantId)));
    }

    private void ApplyTenantOnlyFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => 
            CurrentUserRole == UserRole.SuperAdmin || (CurrentTenantId != null && e.TenantId == CurrentTenantId));
    }

    private void ApplySoftDeleteOnlyFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ISoftDelete
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => !e.IsDeleted);
    }

    public override int SaveChanges()
    {
        EnforceTenantRules();
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => SaveChangesInternalAsync(cancellationToken);

    private async Task<int> SaveChangesInternalAsync(CancellationToken cancellationToken)
    {
        EnforceTenantRules();
        await EnforcePlanLimitsAsync(cancellationToken);

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

        RecordAuditLogs();

        return await base.SaveChangesAsync(cancellationToken);
    }

    private void RecordAuditLogs()
    {
        var sensitiveEntities = new HashSet<string> { "User", "Tenant", "ClinicSubscription", "PatientAppointment", "Visit" };
        var entries = ChangeTracker.Entries<BaseEntity>()
            .Where(e => !(e.Entity is AuditLog) && 
                        (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted) &&
                        sensitiveEntities.Contains(e.Entity.GetType().Name))
            .ToList();

        if (!entries.Any()) return;

        var performer = _tenantProvider.Role != null ? $"{_tenantProvider.Role} (Tenant: {_tenantProvider.TenantId})" : "System";

        foreach (var entry in entries)
        {
            var entityName = entry.Entity.GetType().Name;
            var action = entry.State.ToString();

            var log = new AuditLog
            {
                EntityName = entityName,
                Action = action,
                PerformedBy = performer,
                Timestamp = DateTime.UtcNow
            };

            AuditLogs.Add(log);
        }
    }

    private void EnforceTenantRules()
    {
        var isSuperAdmin = CurrentUserRole == UserRole.SuperAdmin || _tenantProvider.IsSuperAdmin;
        var trustedTenantId = _tenantProvider.TenantId;

        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (!isSuperAdmin)
                {
                    // Non-SuperAdmin CANNOT inject arbitrary TenantId.
                    // If trustedTenantId exists, enforce it unconditionally over any client value.
                    if (trustedTenantId.HasValue)
                    {
                        entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue = trustedTenantId.Value;
                    }
                    else if (entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue == null)
                    {
                        throw new InvalidOperationException(
                            $"Cannot create tenant-scoped entity '{entry.Entity.GetType().Name}' without an active trusted tenant context.");
                    }
                }
                else
                {
                    // SuperAdmin may explicitly set TenantId on entity or fallback to current scoped tenant
                    if (entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue == null && trustedTenantId.HasValue)
                    {
                        entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue = trustedTenantId.Value;
                    }
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                if (!isSuperAdmin)
                {
                    // TenantId is strictly IMMUTABLE on UPDATE / PATCH for non-SuperAdmin
                    var tenantIdProp = entry.Property(nameof(ITenantEntity.TenantId));
                    var originalTenantId = (Guid?)tenantIdProp.OriginalValue;
                    var currentTenantId = (Guid?)tenantIdProp.CurrentValue;

                    if (originalTenantId.HasValue && currentTenantId.HasValue && originalTenantId.Value != currentTenantId.Value)
                    {
                        throw new InvalidOperationException(
                            $"Cross-tenant security violation: TenantId is immutable on '{entry.Entity.GetType().Name}' and cannot be altered.");
                    }

                    // Prevent EF Core from issuing TenantId column in SQL UPDATE statements
                    tenantIdProp.IsModified = false;
                }
            }
            else if (entry.State == EntityState.Deleted)
            {
                if (!isSuperAdmin && trustedTenantId.HasValue)
                {
                    var tenantIdProp = entry.Property(nameof(ITenantEntity.TenantId));
                    var entityTenantId = (Guid?)tenantIdProp.OriginalValue ?? (Guid?)tenantIdProp.CurrentValue;

                    if (entityTenantId.HasValue && entityTenantId.Value != trustedTenantId.Value)
                    {
                        throw new InvalidOperationException(
                            $"Cross-tenant security violation: Cannot delete entity '{entry.Entity.GetType().Name}' belonging to another tenant.");
                    }
                }
            }
        }
    }

    private async Task EnforcePlanLimitsAsync(CancellationToken cancellationToken)
    {
        var addedEntries = ChangeTracker.Entries<ITenantEntity>()
            .Where(e => e.State == EntityState.Added)
            .ToList();

        if (addedEntries.Count == 0)
            return;

        // HIGH PERFORMANCE FIX: Only check limits if the added entities are restricted ones
        bool hasRestrictedEntities = addedEntries.Any(e => 
            e.Entity is Doctor || 
            e.Entity is Patient || 
            e.Entity is PatientAppointment);

        if (!hasRestrictedEntities)
            return;

        var affectedTenantIds = addedEntries
            .Select(e => e.Property(nameof(ITenantEntity.TenantId)).CurrentValue)
            .OfType<Guid>()
            .Distinct()
            .ToList();

        foreach (var tenantId in affectedTenantIds)
        {
            var subscription = await ClinicSubscriptions
                .AsNoTracking()
                .Where(s => s.ClinicId == tenantId
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial)
                    && s.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(s => s.ExpiresAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (subscription == null)
                throw new DomainException("Clinic does not have an active subscription plan.");

            if (subscription.Status == SubscriptionStatus.Trial)
                continue;

            var plan = await Plans
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == subscription.PlanId, cancellationToken)
                ?? throw new DomainException("Subscription plan could not be found.");

            // Only check Doctor limit if a Doctor was added
            if (addedEntries.Any(e => e.Entity is Doctor && e.Entity.TenantId == tenantId))
            {
                await EnsureLimitAsync(
                    tenantId,
                    plan.MaxDoctors,
                    Doctors.IgnoreQueryFilters().CountAsync(d => !d.IsDeleted && d.TenantId == tenantId, cancellationToken),
                    addedEntries.Count(e => e.Entity is Doctor && e.Entity.TenantId == tenantId),
                    "doctors");
            }

            // Only check Patient limit if a Patient was added
            if (addedEntries.Any(e => e.Entity is Patient && e.Entity.TenantId == tenantId))
            {
                await EnsureLimitAsync(
                    tenantId,
                    plan.MaxPatients,
                    Patients.IgnoreQueryFilters().CountAsync(p => !p.IsDeleted && p.TenantId == tenantId, cancellationToken),
                    addedEntries.Count(e => e.Entity is Patient && e.Entity.TenantId == tenantId),
                    "patients");
            }

            // Only check Appointment limit if an Appointment was added
            if (addedEntries.Any(e => e.Entity is PatientAppointment && e.Entity.TenantId == tenantId))
            {
                await EnsureLimitAsync(
                    tenantId,
                    plan.MaxBookings,
                    Appointments.IgnoreQueryFilters().CountAsync(a => !a.IsDeleted && a.TenantId == tenantId, cancellationToken),
                    addedEntries.Count(e => e.Entity is PatientAppointment && e.Entity.TenantId == tenantId),
                    "appointments");
            }
        }
    }

    private static async Task EnsureLimitAsync(
        Guid tenantId,
        int? limit,
        Task<int> persistedCountTask,
        int pendingAddedCount,
        string resourceName)
    {
        if (!limit.HasValue)
            return;

        var persistedCount = await persistedCountTask;
        var projectedCount = persistedCount + pendingAddedCount;

        if (projectedCount >= limit.Value)
            throw new DomainException($"Plan limit exceeded for {resourceName}. Tenant '{tenantId}' allows up to {limit.Value}.");
    }
}
