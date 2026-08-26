using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Numerics;

namespace ClinicBookingSystem.Infrastructure.Persistence.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly ApplicationDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>(); // this  main point  of  repository pattern  to  abstract the DbSet and to provide a common interface for all entities that inherit from BaseEntity and also to manage the lifecycle of the DbSet and to provide a common implementation for all entities that inherit from BaseEntity 
        // this same  geve me  table  T  from the  database  and  i can  perform  all the operations on this DbSet in memory and then when i call save changes method of unit of work it will commit all the changes made to the DbSet to the database in a single transaction
    }

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default, params System.Linq.Expressions.Expression<Func<T, object>>[] includes)
    {
        var query = _dbSet.AsNoTracking();
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        return await query.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<T>> GetAllAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes)
    {
        var query = _dbSet.AsNoTracking();
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        if (predicate != null) query = query.Where(predicate);
        return await query.ToListAsync(cancellationToken);
    }

    public async Task<bool> AnyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet.AsNoTracking().AnyAsync(predicate, cancellationToken);
    }

    public async Task<int> CountAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet.AsNoTracking().CountAsync(predicate, cancellationToken);
    }

    public async Task<T?> FirstOrDefaultAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes)
    {
        var query = _dbSet.AsNoTracking();
        if (typeof(T) == typeof(User) && _context.CurrentTenantId == null && _context.CurrentUserRole != UserRole.SuperAdmin)
        {
            query = query.IgnoreQueryFilters();
        }
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        return await query.FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public IQueryable<T> AsQueryable() => _dbSet.AsNoTracking();

    public async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize, 
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes)
    {
        var baseQuery = _dbSet.AsNoTracking();
        if (predicate != null) baseQuery = baseQuery.Where(predicate);

        var total = await baseQuery.CountAsync(cancellationToken);

        var itemsQuery = baseQuery;
        if (includes != null) itemsQuery = includes.Aggregate(itemsQuery, (current, include) => current.Include(include));

        var items = await itemsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
        => await _dbSet.AddAsync(entity, cancellationToken);

    public Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        var entry = _context.Entry(entity);
        if (entry.State == EntityState.Detached)
        {
            var existing = _dbSet.Local.FirstOrDefault(e => e.Id == entity.Id);
            if (existing != null)
            {
                _context.Entry(existing).CurrentValues.SetValues(entity);
                return Task.CompletedTask;
            }
            _dbSet.Attach(entity);
            entry.State = EntityState.Modified;
        }
        else if (entry.State == EntityState.Unchanged)
        {
            entry.State = EntityState.Modified;
        }
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        var entry = _context.Entry(entity);
        if (entry.State == EntityState.Detached)
        {
            var existing = _dbSet.Local.FirstOrDefault(e => e.Id == entity.Id);
            if (existing != null)
            {
                existing.IsDeleted = true;
                _context.Entry(existing).State = EntityState.Modified;
                return Task.CompletedTask;
            }
            _dbSet.Attach(entity);
        }
        entity.IsDeleted = true;
        entry.State = EntityState.Modified;
        return Task.CompletedTask;
    }
}

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? _currentTransaction;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
        Tenants = new Repository<Tenant>(context);
        Users = new Repository<User>(context);
        Appointments = new Repository<PatientAppointment>(context);
        Doctors = new Repository<Doctor>(context);
        Schedules = new Repository<Schedule>(context);
        BlockedSlots = new Repository<BlockedSlot>(context);
        Notifications = new Repository<Notification>(context);
        AuditLogs = new Repository<AuditLog>(context);

        Patients = new Repository<Patient>(context);
        Visits = new Repository<Visit>(context);
        Vitals = new Repository<Vitals>(context);
        Examinations = new Repository<Examination>(context);
        Diagnoses = new Repository<Diagnosis>(context);
        Prescriptions = new Repository<Prescription>(context);
        LabOrders = new Repository<LabOrder>(context);
        ImagingOrders = new Repository<ImagingOrder>(context);
        Results = new Repository<Result>(context);
        Drugs = new Repository<Drug>(context);
        Planes = new Repository<Plan>(context);
        ClinicSubscriptions = new Repository<ClinicSubscription>(context);
        Features = new Repository<Feature>(context);
        PlanFeatures = new Repository<PlanFeature>(context);
        PaymentTransactions = new Repository<PaymentTransaction>(context);
        PendingOnboardings = new Repository<PendingOnboarding>(context);
    }

    public IRepository<Tenant> Tenants { get; }
    public IRepository<User> Users { get; }
    public IRepository<PatientAppointment> Appointments { get; }
    public IRepository<Doctor> Doctors { get; }
    public IRepository<Schedule> Schedules { get; }
    public IRepository<BlockedSlot> BlockedSlots { get; }
    public IRepository<Notification> Notifications { get; }
    public IRepository<AuditLog> AuditLogs { get; }

    public IRepository<Patient> Patients { get; }
    public IRepository<Visit> Visits { get; }
    public IRepository<Vitals> Vitals { get; }
    public IRepository<Examination> Examinations { get; }
    public IRepository<Diagnosis> Diagnoses { get; }
    public IRepository<Prescription> Prescriptions { get; }
    public IRepository<LabOrder> LabOrders { get; }
    public IRepository<ImagingOrder> ImagingOrders { get; }
    public IRepository<Result> Results { get; }
    public IRepository<Drug> Drugs { get; }

    public IRepository<ClinicSubscription> ClinicSubscriptions { get; }

    public IRepository<Feature> Features { get; }
    public IRepository<PlanFeature> PlanFeatures { get; }
    public IRepository<PaymentTransaction> PaymentTransactions { get; }
    public IRepository<PendingOnboarding> PendingOnboardings { get; }

    public IRepository<Plan> Planes { get; }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction == null && _context.Database.IsRelational())
        {
            _currentTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        }
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null)
        {
            await _currentTransaction.CommitAsync(cancellationToken);
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null)
        {
            await _currentTransaction.RollbackAsync(cancellationToken);
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }
}
