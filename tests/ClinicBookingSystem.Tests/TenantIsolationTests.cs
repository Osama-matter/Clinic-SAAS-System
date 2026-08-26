using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class TenantIsolationTests
{
    private (ApplicationDbContext DbContext, Mock<ITenantProvider> TenantProviderMock) CreateTestDbContext(
        Guid? tenantId,
        UserRole? role = UserRole.Admin,
        bool isSuperAdmin = false,
        string? dbName = null)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(role);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? $"IsolationDb_{Guid.NewGuid()}")
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        return (dbContext, tenantProviderMock);
    }

    private async Task SeedActiveSubscriptionAsync(ApplicationDbContext dbContext, Guid clinicId)
    {
        var plan = new Plan
        {
            Name = "Test Plan",
            Price = 100,
            DurationDays = 365,
            MaxDoctors = 100,
            MaxPatients = 100,
            MaxBookings = 1000,
            IsActive = true
        };
        await dbContext.Plans.AddAsync(plan);

        var subscription = new ClinicSubscription
        {
            ClinicId = clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Trial,
            StartDate = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddYears(1)
        };
        await dbContext.ClinicSubscriptions.AddAsync(subscription);
        await dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task QueryIsolation_TenantA_CannotSeeTenantB_Entities()
    {
        // Arrange
        var dbName = $"SharedDb_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed records for Tenant A and Tenant B
        var (seedContext, _) = CreateTestDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedContext, tenantA);
        await SeedActiveSubscriptionAsync(seedContext, tenantB);

        var patientA = new Patient { TenantId = tenantA, Name = "Alice Tenant A", Phone = "111", Gender = GenderType.Female, DateOfBirth = new DateTime(1990, 1, 1) };
        var patientB = new Patient { TenantId = tenantB, Name = "Bob Tenant B", Phone = "222", Gender = GenderType.Male, DateOfBirth = new DateTime(1992, 2, 2) };

        var scheduleA = new Schedule { TenantId = tenantA, DoctorId = Guid.NewGuid(), DayOfWeek = System.DayOfWeek.Monday, StartTime = TimeSpan.FromHours(9), EndTime = TimeSpan.FromHours(17) };
        var scheduleB = new Schedule { TenantId = tenantB, DoctorId = Guid.NewGuid(), DayOfWeek = System.DayOfWeek.Tuesday, StartTime = TimeSpan.FromHours(10), EndTime = TimeSpan.FromHours(18) };

        await seedContext.Patients.AddRangeAsync(patientA, patientB);
        await seedContext.Schedules.AddRangeAsync(scheduleA, scheduleB);
        await seedContext.SaveChangesAsync();

        // Act - Query as Tenant A
        var (tenantAContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin, dbName: dbName);

        var patientsForTenantA = await tenantAContext.Patients.ToListAsync();
        var schedulesForTenantA = await tenantAContext.Schedules.ToListAsync();

        // Assert
        Assert.Single(patientsForTenantA);
        Assert.Equal("Alice Tenant A", patientsForTenantA[0].Name);

        Assert.Single(schedulesForTenantA);
        Assert.Equal(System.DayOfWeek.Monday, schedulesForTenantA[0].DayOfWeek);
    }

    [Fact]
    public async Task SuperAdmin_CanQueryAcrossAllTenants()
    {
        // Arrange
        var dbName = $"SharedDb_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedContext, _) = CreateTestDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedContext, tenantA);
        await SeedActiveSubscriptionAsync(seedContext, tenantB);

        var patientA = new Patient { TenantId = tenantA, Name = "Alice Tenant A", Phone = "111", Gender = GenderType.Female, DateOfBirth = new DateTime(1990, 1, 1) };
        var patientB = new Patient { TenantId = tenantB, Name = "Bob Tenant B", Phone = "222", Gender = GenderType.Male, DateOfBirth = new DateTime(1992, 2, 2) };

        await seedContext.Patients.AddRangeAsync(patientA, patientB);
        await seedContext.SaveChangesAsync();

        // Act - Query as SuperAdmin
        var (superAdminContext, _) = CreateTestDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var allPatients = await superAdminContext.Patients.ToListAsync();

        // Assert
        Assert.Equal(2, allPatients.Count);
    }

    [Fact]
    public async Task SoftDeleted_Records_AreFilteredOut_ByDefault()
    {
        // Arrange
        var dbName = $"SharedDb_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();

        var (seedContext, _) = CreateTestDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedContext, tenantA);

        var activePatient = new Patient { TenantId = tenantA, Name = "Active Patient", Phone = "111", Gender = GenderType.Female, DateOfBirth = new DateTime(1990, 1, 1), IsDeleted = false };
        var deletedPatient = new Patient { TenantId = tenantA, Name = "Deleted Patient", Phone = "222", Gender = GenderType.Male, DateOfBirth = new DateTime(1992, 2, 2), IsDeleted = true };

        await seedContext.Patients.AddRangeAsync(activePatient, deletedPatient);
        await seedContext.SaveChangesAsync();

        // Act
        var (tenantAContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin, dbName: dbName);
        var patients = await tenantAContext.Patients.ToListAsync();

        // Assert
        Assert.Single(patients);
        Assert.Equal("Active Patient", patients[0].Name);
    }
}
