using ClinicBookingSystem.Domain.Entities;
using System.Runtime.CompilerServices;

namespace ClinicBookingSystem.Domain.Interfaces;

public interface IRepository<T> where T : BaseEntity   // repesotry  use  to  perfore  operation ad  Dbset  not  at  database level  but  at  service level  and  this  is  generic repository  that  can  be used for any entity that inherits from BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default, params System.Linq.Expressions.Expression<Func<T, object>>[] includes);// get  by  id  method  can send  a  lambda  expression  to  include  related  entities  and  also  can  send cancellation token to cancel the operation if needed
    Task<IEnumerable<T>> GetAllAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes); // get all method  can  send  a  lambda  expression  to filter the results and also  can send cancellation token to cancel the operation if needed and also can send a lambda expression to include related entities
    
    Task<bool> AnyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default);

    Task<int> CountAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default);

    Task<T?> FirstOrDefaultAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes);

    Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize, 
        System.Linq.Expressions.Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default,
        params System.Linq.Expressions.Expression<Func<T, object>>[] includes);
    Task AddAsync(T entity, CancellationToken cancellationToken = default); // add method  to add a new entity to the Dbset in memory   and also can send cancellation token to cancel the operation if needed
    Task UpdateAsync(T entity, CancellationToken cancellationToken = default); // update method  to update an existing entity in the Dbset in memory   and also can send cancellation token to cancel the operation if needed
    Task DeleteAsync(T entity, CancellationToken cancellationToken = default); // delete method  to delete an existing entity from the Dbset in memory   and also can send cancellation token to cancel the operation if needed
}

public interface IUnitOfWork // unit of work  pattern  to  group multiple repository operations into a single transaction and also to manage the lifecycle of the repositories
{
    IRepository<Tenant> Tenants { get; }
    IRepository<User> Users { get; }
    IRepository<PatientAppointment> Appointments { get; }
    IRepository<Doctor> Doctors { get; }
    IRepository<Schedule> Schedules { get; }
    IRepository<BlockedSlot> BlockedSlots { get; }
    IRepository<Notification> Notifications { get; }
    IRepository<AuditLog> AuditLogs { get; }

    // Medical System
    IRepository<Patient> Patients { get; }
    IRepository<Visit> Visits { get; }
    IRepository<Vitals> Vitals { get; }
    IRepository<Examination> Examinations { get; }
    IRepository<Diagnosis> Diagnoses { get; }
    IRepository<Prescription> Prescriptions { get; }
    IRepository<LabOrder> LabOrders { get; }
    IRepository<ImagingOrder> ImagingOrders { get; }
    IRepository<Result> Results { get; }
    

    // plane syatem 

    IRepository<Plan> Planes { get; }

    IRepository<ClinicSubscription> ClinicSubscriptions { get; }

    IRepository<Feature> Features { get; }

    IRepository<PlanFeature> PlanFeatures { get; }
    IRepository<PaymentTransaction> PaymentTransactions { get; }
    IRepository<PendingOnboarding> PendingOnboardings { get; }




    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default); // save changes method to commit all the changes made to the repositories in a single transaction and also can send cancellation token to cancel the operation if needed

    // summary of i Uint of work  pattern  is  to  provide a single point of access to multiple repositories and to manage the lifecycle of the repositories and to commit all the changes made to the repositories in a single transaction
    // can make  implementation of this interface  using  Entity Framework Core  and also can make a mock implementation for unit testing
   
}
