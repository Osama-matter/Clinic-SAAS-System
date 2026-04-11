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

        var applyTenantFilterMethod = GetType()
            .GetMethod(nameof(ApplyTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType)
                && typeof(ISoftDelete).IsAssignableFrom(entityType.ClrType)
                && entityType.ClrType != typeof(User))
            {
                var method = applyTenantFilterMethod!.MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
        }
    }

    private void ApplyTenantFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity, ISoftDelete
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => 
            !e.IsDeleted && 
            (CurrentUserRole == UserRole.SuperAdmin || (CurrentTenantId != null && e.TenantId == CurrentTenantId)));
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => SaveChangesInternalAsync(cancellationToken);

    private async Task<int> SaveChangesInternalAsync(CancellationToken cancellationToken)
    {
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue == null)
                {
                    entry.Property(nameof(ITenantEntity.TenantId)).CurrentValue = _tenantProvider.TenantId;
                }
            }
        }

        await EnforcePlanLimitsAsync(cancellationToken);

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    private async Task EnforcePlanLimitsAsync(CancellationToken cancellationToken)
    {
        var affectedTenantIds = ChangeTracker.Entries<ITenantEntity>()
            .Where(e => e.State == EntityState.Added)
            .Select(e => e.Property(nameof(ITenantEntity.TenantId)).CurrentValue)
            .OfType<Guid>()
            .Distinct()
            .ToList();

        if (affectedTenantIds.Count == 0)
            return;

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

            await EnsureLimitAsync(
                tenantId,
                plan.MaxDoctors,
                Doctors.IgnoreQueryFilters().CountAsync(d => !d.IsDeleted && d.TenantId == tenantId, cancellationToken),
                ChangeTracker.Entries<Doctor>().Count(e => e.State == EntityState.Added && e.Entity.TenantId == tenantId),
                "doctors");

            await EnsureLimitAsync(
                tenantId,
                plan.MaxPatients,
                Patients.IgnoreQueryFilters().CountAsync(p => !p.IsDeleted && p.TenantId == tenantId, cancellationToken),
                ChangeTracker.Entries<Patient>().Count(e => e.State == EntityState.Added && e.Entity.TenantId == tenantId),
                "patients");

            await EnsureLimitAsync(
                tenantId,
                plan.MaxBookings,
                Appointments.IgnoreQueryFilters().CountAsync(a => !a.IsDeleted && a.TenantId == tenantId, cancellationToken),
                ChangeTracker.Entries<PatientAppointment>().Count(e => e.State == EntityState.Added && e.Entity.TenantId == tenantId),
                "appointments");
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

        if (projectedCount > limit.Value)
            throw new DomainException($"Plan limit exceeded for {resourceName}. Tenant '{tenantId}' allows up to {limit.Value}.");
    }
}
