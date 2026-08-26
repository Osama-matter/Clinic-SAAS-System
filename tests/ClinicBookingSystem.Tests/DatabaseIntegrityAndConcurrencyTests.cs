using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Threading.Tasks;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class DatabaseIntegrityAndConcurrencyTests
{
    private readonly Guid _tenantA = Guid.NewGuid();
    private readonly Guid _tenantB = Guid.NewGuid();
    private readonly string _sharedDbName = $"IntegrityDb_{Guid.NewGuid():N}";

    private ApplicationDbContext CreateDbContext(Guid? tenantId)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(tenantId == null ? UserRole.SuperAdmin : UserRole.Admin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(tenantId == null);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        return new ApplicationDbContext(options, tenantProviderMock.Object);
    }

    [Fact]
    public async Task SameEmailInDifferentTenants_IsAllowedByTenantScopedUniqueness()
    {
        var email = "shared.user@example.com";

        using var dbA = CreateDbContext(_tenantA);
        var planA = new Plan { Name = "Plan A", Price = 10, DurationDays = 30, MaxDoctors = 10, MaxPatients = 100, MaxBookings = 1000, IsActive = true };
        dbA.Plans.Add(planA);
        dbA.ClinicSubscriptions.Add(new ClinicSubscription { ClinicId = _tenantA, PlanId = planA.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddDays(30) });

        var userA = new User
        {
            TenantId = _tenantA,
            Name = "Tenant A User",
            Email = email,
            PasswordHash = "hashA",
            Role = UserRole.Patient
        };
        dbA.Users.Add(userA);
        await dbA.SaveChangesAsync();

        using var dbB = CreateDbContext(_tenantB);
        var planB = new Plan { Name = "Plan B", Price = 10, DurationDays = 30, MaxDoctors = 10, MaxPatients = 100, MaxBookings = 1000, IsActive = true };
        dbB.Plans.Add(planB);
        dbB.ClinicSubscriptions.Add(new ClinicSubscription { ClinicId = _tenantB, PlanId = planB.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddDays(30) });

        var userB = new User
        {
            TenantId = _tenantB,
            Name = "Tenant B User",
            Email = email,
            PasswordHash = "hashB",
            Role = UserRole.Patient
        };
        dbB.Users.Add(userB);

        // Act & Assert - Adding the same email across two distinct tenants succeeds cleanly
        await dbB.SaveChangesAsync();

        var loadedA = await dbA.Users.FirstOrDefaultAsync(u => u.Email == email && u.TenantId == _tenantA);
        var loadedB = await dbB.Users.FirstOrDefaultAsync(u => u.Email == email && u.TenantId == _tenantB);

        Assert.NotNull(loadedA);
        Assert.NotNull(loadedB);
        Assert.NotEqual(loadedA.Id, loadedB.Id);
    }
}
