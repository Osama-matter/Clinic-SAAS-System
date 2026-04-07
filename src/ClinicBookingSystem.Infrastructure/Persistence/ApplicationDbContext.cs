using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
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

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PatientAppointment> Appointments => Set<PatientAppointment>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<BlockedSlot> BlockedSlots => Set<BlockedSlot>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // New Medical Entities
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<Vitals> Vitals => Set<Vitals>();
    public DbSet<Examination> Examinations => Set<Examination>();
    public DbSet<Diagnosis> Diagnoses => Set<Diagnosis>();
    public DbSet<Drug> Drugs => Set<Drug>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<ImagingOrder> ImagingOrders => Set<ImagingOrder>();
    public DbSet<Result> Results => Set<Result>();


    public DbSet<ClinicSubscription> ClinicSubscriptions => Set<ClinicSubscription>();

    public DbSet<Plan> Plans => Set<Plan>();

    public DbSet<Feature> Features => Set<Feature>();

    public DbSet<PlanFeature> PlanFeature => Set<PlanFeature>();




    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global Query Filters for Multi-Tenancy + Soft Delete
        // NOTE: User entity is excluded — login must find users by email regardless of tenant
        // NOTE: When CurrentTenantId is null (guest/unauthenticated), no tenant filter is applied
        //       so public endpoints (e.g. GET /Doctors) return all records.
        // NOTE: This replaces the individual HasQueryFilter(!IsDeleted) from EntityConfigurations
        //       for ITenantEntity types. The combined filter is: !IsDeleted && (TenantId == null || TenantId == CurrentTenantId)
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType)
                && entityType.ClrType != typeof(User))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");

                // !e.IsDeleted
                var isDeletedProp = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var notDeleted = Expression.Not(isDeletedProp);

                // CurrentTenantId == null || e.TenantId == CurrentTenantId
                var currentTenantIdExpr = Expression.Property(Expression.Constant(this), nameof(CurrentTenantId));
                var nullGuid = Expression.Constant(null, typeof(Guid?));
                var isNullCheck = Expression.Equal(currentTenantIdExpr, nullGuid);
                var tenantMatch = Expression.Equal(
                    Expression.Property(parameter, nameof(ITenantEntity.TenantId)),
                    currentTenantIdExpr
                );
                var tenantFilter = Expression.OrElse(isNullCheck, tenantMatch);

                // Combine: !IsDeleted && (TenantId == null || TenantId == CurrentTenantId)
                var body = Expression.AndAlso(notDeleted, tenantFilter);
                var filter = Expression.Lambda(body, parameter);
                entityType.SetQueryFilter(filter);
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

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

        return base.SaveChangesAsync(cancellationToken);
    }
}
