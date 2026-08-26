using ClinicBookingSystem.Application.Features.Auth;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class PatientRegistrySecurityTests
{
    private (ApplicationDbContext DbContext, IUnitOfWork UnitOfWork, Mock<ICurrentUserService> CurrentUserMock) CreateTestContext(
        Guid? tenantId,
        string role = "Receptionist",
        bool isSuperAdmin = false,
        string? dbName = null)
    {
        var roleEnum = Enum.TryParse<UserRole>(role, true, out var parsedRole) ? parsedRole : (UserRole?)null;

        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(roleEnum);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(c => c.TenantId).Returns(tenantId);
        currentUserMock.Setup(c => c.Role).Returns(role);
        currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
        currentUserMock.Setup(c => c.UserId).Returns(Guid.NewGuid());

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? $"PatientRegistrySecDb_{Guid.NewGuid()}")
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow, currentUserMock);
    }

    [Fact]
    public async Task Test1_TenantA_SeesOnly_TenantA_Patients()
    {
        // Arrange
        var dbName = $"PatientDb_Test1_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);

        var userA1 = new User { TenantId = tenantA, Name = "Alice Tenant A", Email = "alice.a@test.com", Role = UserRole.User, PasswordHash = "h" };
        var userA2 = new User { TenantId = tenantA, Name = "Alan Tenant A", Email = "alan.a@test.com", Role = UserRole.User, PasswordHash = "h" };
        var userB1 = new User { TenantId = tenantB, Name = "Bob Tenant B", Email = "bob.b@test.com", Role = UserRole.User, PasswordHash = "h" };
        var userB2 = new User { TenantId = tenantB, Name = "Bella Tenant B", Email = "bella.b@test.com", Role = UserRole.User, PasswordHash = "h" };

        await seedDb.Users.AddRangeAsync(userA1, userA2, userB1, userB2);
        await seedDb.SaveChangesAsync();

        // Query as Tenant A
        var (_, uowA, currentUserMockA) = CreateTestContext(tenantA, role: "Receptionist", isSuperAdmin: false, dbName: dbName);
        var handler = new GetPatientsQueryHandler(uowA, currentUserMockA.Object);

        // Act
        var result = (await handler.Handle(new GetPatientsQuery(), CancellationToken.None)).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Contains(result, u => u.Name == "Alice Tenant A" && u.TenantId == tenantA);
        Assert.Contains(result, u => u.Name == "Alan Tenant A" && u.TenantId == tenantA);

        Assert.DoesNotContain(result, u => u.TenantId == tenantB);
        Assert.DoesNotContain(result, u => u.Name == "Bob Tenant B");
        Assert.DoesNotContain(result, u => u.Name == "Bella Tenant B");
    }

    [Fact]
    public async Task Test2_TenantB_SeesOnly_TenantB_Patients()
    {
        // Arrange
        var dbName = $"PatientDb_Test2_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);

        var userA = new User { TenantId = tenantA, Name = "Alice Tenant A", Email = "alice.a@test.com", Role = UserRole.User, PasswordHash = "h" };
        var userB = new User { TenantId = tenantB, Name = "Bob Tenant B", Email = "bob.b@test.com", Role = UserRole.User, PasswordHash = "h" };

        await seedDb.Users.AddRangeAsync(userA, userB);
        await seedDb.SaveChangesAsync();

        // Query as Tenant B
        var (_, uowB, currentUserMockB) = CreateTestContext(tenantB, role: "Doctor", isSuperAdmin: false, dbName: dbName);
        var handler = new GetPatientsQueryHandler(uowB, currentUserMockB.Object);

        // Act
        var result = (await handler.Handle(new GetPatientsQuery(), CancellationToken.None)).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal("Bob Tenant B", result[0].Name);
        Assert.Equal(tenantB, result[0].TenantId);
        Assert.DoesNotContain(result, u => u.TenantId == tenantA);
    }

    [Fact]
    public async Task Test3_IdenticalPatientData_AcrossTenants_EnforcesTenantIdentity()
    {
        // Arrange
        var dbName = $"PatientDb_Test3_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);

        var userInA = new User { TenantId = tenantA, Name = "John Smith", Email = "john@example.com", PhoneNumber = "01000000000", Role = UserRole.User, PasswordHash = "h" };
        var userInB = new User { TenantId = tenantB, Name = "John Smith", Email = "john@example.com", PhoneNumber = "01000000000", Role = UserRole.User, PasswordHash = "h" };

        await seedDb.Users.AddRangeAsync(userInA, userInB);
        await seedDb.SaveChangesAsync();

        // Query as Tenant A
        var (_, uowA, currentUserMockA) = CreateTestContext(tenantA, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var handler = new GetPatientsQueryHandler(uowA, currentUserMockA.Object);

        // Act
        var result = (await handler.Handle(new GetPatientsQuery(), CancellationToken.None)).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal(tenantA, result[0].TenantId);
        Assert.Equal("John Smith", result[0].Name);
    }

    [Fact]
    public async Task Test4_MissingTenantContext_FailsClosed_ThrowsUnauthorizedActionException()
    {
        // Arrange
        var dbName = $"PatientDb_Test4_{Guid.NewGuid()}";
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);

        var user = new User { TenantId = Guid.NewGuid(), Name = "Some Patient", Email = "p@test.com", Role = UserRole.User, PasswordHash = "h" };
        await seedDb.Users.AddAsync(user);
        await seedDb.SaveChangesAsync();

        // Query with missing tenant context as normal receptionist
        var (_, uowNoTenant, currentUserMockNoTenant) = CreateTestContext(tenantId: null, role: "Receptionist", isSuperAdmin: false, dbName: dbName);
        var handler = new GetPatientsQueryHandler(uowNoTenant, currentUserMockNoTenant.Object);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(new GetPatientsQuery(), CancellationToken.None));
    }

    [Fact]
    public async Task Test5_SuperAdmin_CanAccessGlobalRegistry_OrTargetTenant()
    {
        // Arrange
        var dbName = $"PatientDb_Test5_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);

        var userA = new User { TenantId = tenantA, Name = "Alice A", Email = "a@test.com", Role = UserRole.User, PasswordHash = "h" };
        var userB = new User { TenantId = tenantB, Name = "Bob B", Email = "b@test.com", Role = UserRole.User, PasswordHash = "h" };

        await seedDb.Users.AddRangeAsync(userA, userB);
        await seedDb.SaveChangesAsync();

        // SuperAdmin with null tenant retrieves global list
        var (_, uowSuper, currentUserMockSuper) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var handler = new GetPatientsQueryHandler(uowSuper, currentUserMockSuper.Object);

        // Act
        var globalResult = (await handler.Handle(new GetPatientsQuery(), CancellationToken.None)).ToList();

        // Assert
        Assert.Equal(2, globalResult.Count);
        Assert.Contains(globalResult, u => u.Name == "Alice A");
        Assert.Contains(globalResult, u => u.Name == "Bob B");
    }
}
