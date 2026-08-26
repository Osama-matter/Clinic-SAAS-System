using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class TenantOwnershipAndInjectionTests
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
            .UseInMemoryDatabase(databaseName: dbName ?? $"TenantDb_{Guid.NewGuid()}")
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
    public async Task CreateEntity_WithSpoofedTenantB_WhileAuthenticatedAsTenantA_ForcesTenantA()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var spoofedTenantB = Guid.NewGuid();
        var (dbContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin);
        await SeedActiveSubscriptionAsync(dbContext, tenantA);

        var patient = new Patient
        {
            TenantId = spoofedTenantB, // Client attempts to inject Tenant B
            Name = "John Doe",
            Phone = "+1234567890",
            Gender = GenderType.Male,
            DateOfBirth = new DateTime(1990, 1, 1)
        };

        // Act
        await dbContext.Patients.AddAsync(patient);
        await dbContext.SaveChangesAsync();

        // Assert - The entity MUST be saved with Tenant A, overriding the injected Tenant B
        var savedPatient = await dbContext.Patients.IgnoreQueryFilters().FirstAsync(p => p.Id == patient.Id);
        Assert.Equal(tenantA, savedPatient.TenantId);
        Assert.NotEqual(spoofedTenantB, savedPatient.TenantId);
    }

    [Fact]
    public async Task CreateSchedule_WithSpoofedTenantB_WhileAuthenticatedAsTenantA_ForcesTenantA()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var spoofedTenantB = Guid.NewGuid();
        var (dbContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin);

        var schedule = new Schedule
        {
            TenantId = spoofedTenantB, // Client attempts to inject Tenant B
            DoctorId = Guid.NewGuid(),
            DayOfWeek = System.DayOfWeek.Monday,
            StartTime = TimeSpan.FromHours(9),
            EndTime = TimeSpan.FromHours(17)
        };

        // Act
        await dbContext.Schedules.AddAsync(schedule);
        await dbContext.SaveChangesAsync();

        // Assert - The entity MUST be saved with Tenant A
        var savedSchedule = await dbContext.Schedules.IgnoreQueryFilters().FirstAsync(s => s.Id == schedule.Id);
        Assert.Equal(tenantA, savedSchedule.TenantId);
        Assert.NotEqual(spoofedTenantB, savedSchedule.TenantId);
    }

    [Fact]
    public async Task UpdateEntity_AttemptingToChangeTenantId_ThrowsCrossTenantViolation()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var foreignTenantB = Guid.NewGuid();
        var (dbContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin);
        await SeedActiveSubscriptionAsync(dbContext, tenantA);

        var patient = new Patient
        {
            TenantId = tenantA,
            Name = "Jane Doe",
            Phone = "+1234567890",
            Gender = GenderType.Female,
            DateOfBirth = new DateTime(1995, 5, 5)
        };

        await dbContext.Patients.AddAsync(patient);
        await dbContext.SaveChangesAsync();

        // Act: Client attempts to mutate TenantId from Tenant A to Tenant B
        patient.TenantId = foreignTenantB;
        patient.Name = "Jane Doe Updated";

        // Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => dbContext.SaveChangesAsync());
        Assert.Contains("Cross-tenant security violation: TenantId is immutable", ex.Message);
    }

    [Fact]
    public async Task DeleteEntity_BelongingToAnotherTenant_ThrowsCrossTenantViolation()
    {
        // Arrange
        var dbName = $"SharedDb_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed patient in Tenant B using superadmin context
        var (seedContext, _) = CreateTestDbContext(tenantB, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedContext, tenantB);
        await SeedActiveSubscriptionAsync(seedContext, tenantA);

        var patientB = new Patient
        {
            TenantId = tenantB,
            Name = "Tenant B Patient",
            Phone = "+9876543210",
            Gender = GenderType.Male,
            DateOfBirth = new DateTime(1985, 3, 15)
        };
        await seedContext.Patients.AddAsync(patientB);
        await seedContext.SaveChangesAsync();

        // Switch context to Tenant A user sharing the same database
        var (tenantAContext, _) = CreateTestDbContext(tenantA, role: UserRole.Admin, dbName: dbName);

        // Act: User of Tenant A attempts to delete entity belonging to Tenant B
        tenantAContext.Patients.Remove(patientB);

        // Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => tenantAContext.SaveChangesAsync());
        Assert.Contains("Cross-tenant security violation: Cannot delete entity", ex.Message);
    }

    [Fact]
    public async Task SuperAdmin_CanCreateEntityForSpecificTenant()
    {
        // Arrange
        var targetTenant = Guid.NewGuid();
        var (dbContext, _) = CreateTestDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true);
        await SeedActiveSubscriptionAsync(dbContext, targetTenant);

        var patient = new Patient
        {
            TenantId = targetTenant, // SuperAdmin explicitly assigns Tenant
            Name = "SuperAdmin Created Patient",
            Phone = "+1122334455",
            Gender = GenderType.Other,
            DateOfBirth = new DateTime(2000, 10, 10)
        };

        // Act
        await dbContext.Patients.AddAsync(patient);
        await dbContext.SaveChangesAsync();

        // Assert
        var savedPatient = await dbContext.Patients.IgnoreQueryFilters().FirstAsync(p => p.Id == patient.Id);
        Assert.Equal(targetTenant, savedPatient.TenantId);
    }
}
