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
using System.Linq.Expressions;
using Xunit;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Tests;

public class UserGlobalQueryFilterSecurityTests
{
    private (ApplicationDbContext DbContext, IUnitOfWork UnitOfWork, Mock<ITenantProvider> TenantProviderMock) CreateTestContext(
        Guid? tenantId,
        UserRole role,
        bool isSuperAdmin,
        string dbName)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(role);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow, tenantProviderMock);
    }

    [Fact]
    public async Task Test1_TenantA_QueryUsers_ReturnsOnlyTenantAUsers()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test1_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed as SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var userA = new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "Alice", Email = "alice@a.com", Role = UserRole.Doctor };
        var userB = new User { Id = Guid.NewGuid(), TenantId = tenantB, Name = "Bob", Email = "bob@b.com", Role = UserRole.Doctor };
        await seedDb.Users.AddRangeAsync(userA, userB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A Admin
        var (dbA, _, _) = CreateTestContext(tenantId: tenantA, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var usersA = await dbA.Users.ToListAsync();

        // Assert - Only Tenant A user returned
        Assert.Single(usersA);
        Assert.Equal("Alice", usersA[0].Name);
        Assert.Equal(tenantA, usersA[0].TenantId);
        Assert.DoesNotContain(usersA, u => u.TenantId == tenantB);
    }

    [Fact]
    public async Task Test2_TenantB_QueryUsers_ReturnsOnlyTenantBUsers()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test2_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed as SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var userA = new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "Alice", Email = "alice@a.com", Role = UserRole.Receptionist };
        var userB = new User { Id = Guid.NewGuid(), TenantId = tenantB, Name = "Bob", Email = "bob@b.com", Role = UserRole.Receptionist };
        await seedDb.Users.AddRangeAsync(userA, userB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant B Admin
        var (dbB, _, _) = CreateTestContext(tenantId: tenantB, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var usersB = await dbB.Users.ToListAsync();

        // Assert - Only Tenant B user returned
        Assert.Single(usersB);
        Assert.Equal("Bob", usersB[0].Name);
        Assert.Equal(tenantB, usersB[0].TenantId);
        Assert.DoesNotContain(usersB, u => u.TenantId == tenantA);
    }

    [Fact]
    public async Task Test3_CrossTenant_IdenticalUserData_RemainsIsolated()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test3_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var userA = new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "John Smith", Email = "john@example.com", PhoneNumber = "01000000000", Role = UserRole.User };
        var userB = new User { Id = Guid.NewGuid(), TenantId = tenantB, Name = "John Smith", Email = "john@example.com", PhoneNumber = "01000000000", Role = UserRole.User };
        await seedDb.Users.AddRangeAsync(userA, userB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A
        var (dbA, _, _) = CreateTestContext(tenantId: tenantA, role: UserRole.Receptionist, isSuperAdmin: false, dbName: dbName);
        var resultsA = await dbA.Users.Where(u => u.Email == "john@example.com").ToListAsync();

        // Assert - Only Tenant A record returned
        Assert.Single(resultsA);
        Assert.Equal(userA.Id, resultsA[0].Id);
        Assert.Equal(tenantA, resultsA[0].TenantId);
    }

    [Fact]
    public async Task Test4_UserQuery_WithoutTenantContext_FailsClosed()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test4_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await seedDb.Users.AddRangeAsync(
            new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "User A", Email = "a@a.com" },
            new User { Id = Guid.NewGuid(), TenantId = tenantB, Name = "User B", Email = "b@b.com" }
        );
        await seedDb.SaveChangesAsync();

        // Act - Query as unauthenticated/missing tenant context
        var (dbNoTenant, _, _) = CreateTestContext(tenantId: null, role: UserRole.User, isSuperAdmin: false, dbName: dbName);
        var users = await dbNoTenant.Users.ToListAsync();

        // Assert - Fails closed: 0 users returned
        Assert.Empty(users);
    }

    [Fact]
    public async Task Test5_GetById_ForUserBelongingToAnotherTenant_ReturnsNull()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test5_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var userBId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var userB = new User { Id = userBId, TenantId = tenantB, Name = "Victim User", Email = "victim@b.com" };
        await seedDb.Users.AddAsync(userB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A via UnitOfWork.GetByIdAsync
        var (_, uowA, _) = CreateTestContext(tenantId: tenantA, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var retrievedUser = await uowA.Users.GetByIdAsync(userBId, CancellationToken.None);

        // Assert - Filtered out by global query filter
        Assert.Null(retrievedUser);
    }

    [Fact]
    public async Task Test6_Login_StillWorks_WithGlobalFilter()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test6_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);

        var password = "SecurePassword123!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            Name = "Doctor Who",
            Email = "doctor@who.com",
            PasswordHash = BC.HashPassword(password, 12),
            Role = UserRole.Doctor
        };
        await seedDb.Users.AddAsync(user);
        await seedDb.SaveChangesAsync();

        // Act - Unauthenticated login request (no tenant context established yet)
        var (_, uowUnauth, _) = CreateTestContext(tenantId: null, role: UserRole.User, isSuperAdmin: false, dbName: dbName);
        var tokenServiceMock = new Mock<ITokenService>();
        tokenServiceMock
            .Setup(t => t.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UserRole>(), It.IsAny<Guid>()))
            .Returns("fake-jwt-token");
        tokenServiceMock
            .Setup(t => t.GenerateRefreshToken())
            .Returns("fake-refresh-token");
        tokenServiceMock
            .Setup(t => t.HashRefreshToken(It.IsAny<string>()))
            .Returns("fake-hashed-token");

        var loginHandler = new LoginCommandHandler(uowUnauth, tokenServiceMock.Object);
        var response = await loginHandler.Handle(new LoginCommand("doctor@who.com", password), CancellationToken.None);

        // Assert - Successfully authenticated and resolved user
        Assert.NotNull(response);
        Assert.Equal("fake-jwt-token", response.AccessToken);
        Assert.Equal("doctor@who.com", response.User.Email);
        Assert.Equal(tenantA, response.User.TenantId);
    }

    [Fact]
    public async Task Test7_SuperAdmin_CanQueryGlobally_AcrossAllTenants()
    {
        // Arrange
        var dbName = $"UserFilterDb_Test7_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await seedDb.Users.AddRangeAsync(
            new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "Doctor A", Email = "a@clinic.com" },
            new User { Id = Guid.NewGuid(), TenantId = tenantB, Name = "Doctor B", Email = "b@clinic.com" }
        );
        await seedDb.SaveChangesAsync();

        // Act - Query as SuperAdmin
        var (dbSuper, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var allUsers = await dbSuper.Users.ToListAsync();

        // Assert - SuperAdmin receives all global users
        Assert.Equal(2, allUsers.Count);
        Assert.Contains(allUsers, u => u.TenantId == tenantA);
        Assert.Contains(allUsers, u => u.TenantId == tenantB);
    }

    [Fact]
    public void Test8_EfCoreMetadata_VerifiesUserHasGlobalQueryFilter()
    {
        // Arrange
        var (db, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: "MetadataDb");

        // Act
        var userEntityType = db.Model.FindEntityType(typeof(User));
        Assert.NotNull(userEntityType);

        var queryFilter = userEntityType.GetQueryFilter();

        // Assert - Query filter must be present on User entity
        Assert.NotNull(queryFilter);
    }
}
