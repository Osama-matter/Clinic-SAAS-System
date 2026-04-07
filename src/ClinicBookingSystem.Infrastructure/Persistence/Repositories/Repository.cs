using ClinicBookingSystem.Domain.Entities;
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
        var query = _dbSet.AsQueryable();
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        return await query.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<T>> GetAllAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes)// this  method  is  used to  get all the entities of type T from the database and also to filter the entities based on the predicate and also to include the related entities based on the includes parameter and also to support cancellation token for async operations
    {
        var query = _dbSet.AsQueryable();
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        if (predicate != null) query = query.Where(predicate);
        return await query.ToListAsync(cancellationToken);
    }

    public async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize, 
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes)
    {
        var query = _dbSet.AsQueryable();
        if (includes != null) query = includes.Aggregate(query, (current, include) => current.Include(include));
        if (predicate != null) query = query.Where(predicate);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }// this use  if  you  have  a large number of entities and you want to  get  them in pages instead of getting all the entities at once and also to filter the entities based on the predicate and also to include the related entities based on the includes parameter and also to support cancellation token for async operations

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
        => await _dbSet.AddAsync(entity, cancellationToken);

    public Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        entity.IsDeleted = true;
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }
}

public class UnitOfWork : IUnitOfWork   // whats a  uinit of work  pattern  is  to  group multiple repository operations into a single transaction and also to manage the lifecycle of the repositories and to commit all the changes made to the repositories in a single transaction and also to provide a single point of access to multiple repositories and to manage the lifecycle of the repositories and to commit all the changes made to the repositories in a single transaction
{
    private readonly ApplicationDbContext _context;

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
        Planes = new Repository<Plan>(context);
        ClinicSubscriptions = new Repository<ClinicSubscription>(context);
        Features = new Repository<Feature>(context);
        PlanFeatures = new Repository<PlanFeature>(context);

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

   

    public IRepository<ClinicSubscription> ClinicSubscriptions { get; }

    public IRepository<Feature> Features { get; }
    public IRepository<PlanFeature> PlanFeatures { get; }

    public IRepository<Plan> Planes { get; }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);
}
