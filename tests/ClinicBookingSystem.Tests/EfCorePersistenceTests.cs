using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class EfCorePersistenceTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly string _sharedDbName = $"EfTestDb_{Guid.NewGuid():N}";

    public EfCorePersistenceTests()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        using var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var plan = new Plan { Name = "Enterprise", Price = 100, DurationDays = 365, MaxDoctors = 100, MaxPatients = 1000, MaxBookings = 10000, IsActive = true };
        dbContext.Plans.Add(plan);
        var sub = new ClinicSubscription { ClinicId = _tenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) };
        dbContext.ClinicSubscriptions.Add(sub);
        dbContext.SaveChanges();
    }

    private (ApplicationDbContext DbContext, IUnitOfWork Uow) CreateContext()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow);
    }

    [Fact]
    public async Task Repository_UpdateDetachedEntity_WhenAlreadyTracked_UpdatesValuesWithoutTrackingConflict()
    {
        var (dbContext, uow) = CreateContext();

        var doctor = new Doctor
        {
            TenantId = _tenantId,
            Name = "Dr. Original",
            Specialty = "General",
            UserId = Guid.NewGuid()
        };
        await uow.Doctors.AddAsync(doctor);
        await uow.SaveChangesAsync();

        // Simulate detached copy (like from a DTO or another query)
        var detachedDoctor = new Doctor
        {
            Id = doctor.Id,
            TenantId = _tenantId,
            Name = "Dr. Updated",
            Specialty = "Cardiology",
            UserId = doctor.UserId
        };

        // Act - Call UpdateAsync on the detached instance
        await uow.Doctors.UpdateAsync(detachedDoctor);
        await uow.SaveChangesAsync();

        // Assert
        var reloaded = await uow.Doctors.GetByIdAsync(doctor.Id);
        Assert.NotNull(reloaded);
        Assert.Equal("Dr. Updated", reloaded.Name);
        Assert.Equal("Cardiology", reloaded.Specialty);
    }

    [Fact]
    public async Task Repository_DeleteDetachedEntity_MarksIsDeletedAndPreservesSoftDelete()
    {
        var (dbContext, uow) = CreateContext();

        var doctor = new Doctor
        {
            TenantId = _tenantId,
            Name = "Dr. ToDelete",
            Specialty = "Dermatology",
            UserId = Guid.NewGuid()
        };
        await uow.Doctors.AddAsync(doctor);
        await uow.SaveChangesAsync();

        var detachedDoctor = new Doctor
        {
            Id = doctor.Id,
            TenantId = _tenantId,
            Name = doctor.Name,
            Specialty = doctor.Specialty,
            UserId = doctor.UserId
        };

        // Act - Delete detached instance
        await uow.Doctors.DeleteAsync(detachedDoctor);
        await uow.SaveChangesAsync();

        // Assert - Query filter hides soft deleted entity
        var foundWithFilter = await uow.Doctors.GetByIdAsync(doctor.Id);
        Assert.Null(foundWithFilter);

        // Ignore query filter reveals it is marked IsDeleted = true
        var rawEntity = await dbContext.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctor.Id);
        Assert.NotNull(rawEntity);
        Assert.True(rawEntity.IsDeleted);
    }

    [Fact]
    public async Task Repository_QueryWithIncludes_EagerlyLoadsRelatedEntities()
    {
        var (dbContext, uow) = CreateContext();

        var user = new User
        {
            TenantId = _tenantId,
            Name = "Patient User",
            Email = $"patient_{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            Role = UserRole.Patient
        };
        await uow.Users.AddAsync(user);

        var doctor = new Doctor
        {
            TenantId = _tenantId,
            Name = "Dr. Specialist",
            Specialty = "Neurology",
            UserId = Guid.NewGuid()
        };
        await uow.Doctors.AddAsync(doctor);

        var appt = PatientAppointment.Create(
            _tenantId,
            doctor.Id,
            user.Id,
            DateTime.UtcNow.AddDays(2),
            "Eager loading test notes"
        );
        await uow.Appointments.AddAsync(appt);
        await uow.SaveChangesAsync();

        // Act - Load with Include
        var loaded = await uow.Appointments.GetByIdAsync(appt.Id, default, a => a.Doctor, a => a.User!);

        // Assert
        Assert.NotNull(loaded);
        Assert.NotNull(loaded.Doctor);
        Assert.NotNull(loaded.User);
        Assert.Equal("Dr. Specialist", loaded.Doctor.Name);
        Assert.Equal("Patient User", loaded.User!.Name);
    }
}
