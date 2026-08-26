using ClinicBookingSystem.Application.Features.Doctors;
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

public class DoctorDeletionSecurityTests
{
    private (ApplicationDbContext DbContext, IUnitOfWork UnitOfWork, Mock<ICurrentUserService> CurrentUserMock) CreateTestContext(
        Guid? tenantId,
        string? role,
        bool isSuperAdmin,
        string dbName)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(
            role == "SuperAdmin" || role == "6" ? UserRole.SuperAdmin :
            role == "Admin" || role == "2" ? UserRole.Admin :
            role == "Doctor" || role == "3" ? UserRole.Doctor :
            role == "Receptionist" || role == "4" ? UserRole.Receptionist : UserRole.User);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(c => c.TenantId).Returns(tenantId);
        currentUserMock.Setup(c => c.Role).Returns(role);
        currentUserMock.Setup(c => c.UserId).Returns(Guid.NewGuid());
        currentUserMock.Setup(c => c.IsAuthenticated).Returns(role != null);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow, currentUserMock);
    }

    private async Task SeedActiveSubscriptionAsync(ApplicationDbContext db, Guid clinicId)
    {
        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            Name = "Enterprise Plan",
            Price = 1000m,
            DurationDays = 365,
            MaxDoctors = 50,
            MaxPatients = 1000,
            MaxBookings = 5000,
            IsActive = true
        };
        await db.Plans.AddAsync(plan);

        var subscription = new ClinicSubscription
        {
            ClinicId = clinicId,
            PlanId = plan.Id,
            StartDate = DateTime.UtcNow.AddDays(-10),
            ExpiresAt = DateTime.UtcNow.AddDays(355),
            Status = SubscriptionStatus.Active,
            PaidAmount = 1000m,
            PaymentRef = "SUB-ACTIVE"
        };
        await db.ClinicSubscriptions.AddAsync(subscription);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Test1_TenantA_CannotDelete_TenantB_Doctor()
    {
        // Arrange
        var dbName = $"DocDelDb_Test1_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorBId = Guid.NewGuid();
        var userBId = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var userB = new User { Id = userBId, TenantId = tenantB, Name = "Dr. Bob", Email = "bob@b.com", Role = UserRole.Doctor };
        var docB = new Doctor { Id = doctorBId, TenantId = tenantB, UserId = userBId, Name = "Dr. Bob", Specialty = "Cardiology" };
        await seedDb.Users.AddAsync(userB);
        await seedDb.Doctors.AddAsync(docB);
        await seedDb.SaveChangesAsync();

        // Act - Attempt deletion as Tenant A Admin
        var (dbA, uowA, currentUserMockA) = CreateTestContext(tenantId: tenantA, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowA, currentUserMockA.Object, saasMock.Object, fileServiceMock.Object);

        // Assert - Denied with NotFoundException
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new DeleteDoctorCommand(doctorBId), CancellationToken.None));

        // Verify in database: Doctor B and User B remain untouched and not deleted
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedDoc = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorBId);
        var persistedUser = await verifyDb.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userBId);

        Assert.NotNull(persistedDoc);
        Assert.False(persistedDoc.IsDeleted);
        Assert.NotNull(persistedUser);
        Assert.False(persistedUser.IsDeleted);
    }

    [Fact]
    public async Task Test2_TenantB_CannotDelete_TenantA_Doctor_Bidirectional()
    {
        // Arrange
        var dbName = $"DocDelDb_Test2_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();
        var userAId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var userA = new User { Id = userAId, TenantId = tenantA, Name = "Dr. Alice", Email = "alice@a.com", Role = UserRole.Doctor };
        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, UserId = userAId, Name = "Dr. Alice", Specialty = "Dermatology" };
        await seedDb.Users.AddAsync(userA);
        await seedDb.Doctors.AddAsync(docA);
        await seedDb.SaveChangesAsync();

        // Act - Attempt deletion as Tenant B Admin
        var (_, uowB, currentUserMockB) = CreateTestContext(tenantId: tenantB, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowB, currentUserMockB.Object, saasMock.Object, fileServiceMock.Object);

        // Assert - Denied
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None));

        // Verify Doctor A still exists
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedDoc = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorAId);
        Assert.NotNull(persistedDoc);
        Assert.False(persistedDoc.IsDeleted);
    }

    [Fact]
    public async Task Test3_TenantA_CanDelete_TenantA_Doctor()
    {
        // Arrange
        var dbName = $"DocDelDb_Test3_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();
        var userAId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);

        var userA = new User { Id = userAId, TenantId = tenantA, Name = "Dr. Alice", Email = "alice@a.com", Role = UserRole.Doctor };
        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, UserId = userAId, Name = "Dr. Alice", Specialty = "Dermatology" };
        await seedDb.Users.AddAsync(userA);
        await seedDb.Doctors.AddAsync(docA);
        await seedDb.SaveChangesAsync();

        // Act - Delete as Tenant A Admin
        var (dbA, uowA, currentUserMockA) = CreateTestContext(tenantId: tenantA, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowA, currentUserMockA.Object, saasMock.Object, fileServiceMock.Object);

        var result = await handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None);
        Assert.Equal(MediatR.Unit.Value, result);

        // Assert - Soft-deleted in database
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedDoc = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorAId);
        var persistedUser = await verifyDb.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userAId);

        Assert.NotNull(persistedDoc);
        Assert.True(persistedDoc.IsDeleted);
        Assert.NotNull(persistedUser);
        Assert.True(persistedUser.IsDeleted);
    }

    [Fact]
    public async Task Test4_MissingTenantContext_FailsClosed()
    {
        // Arrange
        var dbName = $"DocDelDb_Test4_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);

        var userA = new User { Id = Guid.NewGuid(), TenantId = tenantA, Name = "Dr. Alice", Email = "alice@a.com", Role = UserRole.Doctor };
        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, UserId = userA.Id, Name = "Dr. Alice", Specialty = "Dermatology" };
        await seedDb.Users.AddAsync(userA);
        await seedDb.Doctors.AddAsync(docA);
        await seedDb.SaveChangesAsync();

        // Act - Attempt deletion with missing tenant context
        var (_, uowNoTenant, currentUserMockNoTenant) = CreateTestContext(tenantId: null, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowNoTenant, currentUserMockNoTenant.Object, saasMock.Object, fileServiceMock.Object);

        // Assert - Fails closed with UnauthorizedActionException
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None));

        // Doctor remains untouched
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedDoc = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorAId);
        Assert.NotNull(persistedDoc);
        Assert.False(persistedDoc.IsDeleted);
    }

    [Fact]
    public async Task Test5_IdenticalDoctorData_AcrossTenants_RemainsIsolated()
    {
        // Arrange
        var dbName = $"DocDelDb_Test5_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();
        var doctorBId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, Name = "Dr. Same Name", Specialty = "General" };
        var docB = new Doctor { Id = doctorBId, TenantId = tenantB, Name = "Dr. Same Name", Specialty = "General" };
        await seedDb.Doctors.AddRangeAsync(docA, docB);
        await seedDb.SaveChangesAsync();

        // Act - Delete from Tenant A
        var (_, uowA, currentUserMockA) = CreateTestContext(tenantId: tenantA, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowA, currentUserMockA.Object, saasMock.Object, fileServiceMock.Object);

        await handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None);

        // Assert - Only Tenant A doctor is deleted; Tenant B doctor remains active
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedA = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorAId);
        var persistedB = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorBId);

        Assert.True(persistedA!.IsDeleted);
        Assert.False(persistedB!.IsDeleted);
    }

    [Fact]
    public async Task Test6_SuperAdmin_RetainsAuthorizedDeletion()
    {
        // Arrange
        var dbName = $"DocDelDb_Test6_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();
        var userAId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);

        var userA = new User { Id = userAId, TenantId = tenantA, Name = "Dr. Alice", Email = "alice@a.com", Role = UserRole.Doctor };
        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, UserId = userAId, Name = "Dr. Alice", Specialty = "Dermatology" };
        await seedDb.Users.AddAsync(userA);
        await seedDb.Doctors.AddAsync(docA);
        await seedDb.SaveChangesAsync();

        // Act - SuperAdmin deletes doctor
        var (_, uowSuper, currentUserMockSuper) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowSuper, currentUserMockSuper.Object, saasMock.Object, fileServiceMock.Object);

        var result = await handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None);
        Assert.Equal(MediatR.Unit.Value, result);

        // Assert - Deletion persisted
        var (verifyDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        var persistedDoc = await verifyDb.Doctors.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == doctorAId);
        Assert.True(persistedDoc!.IsDeleted);
    }

    [Fact]
    public async Task Test7_NonAdminRole_CannotDeleteDoctor()
    {
        // Arrange
        var dbName = $"DocDelDb_Test7_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var doctorAId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);

        var docA = new Doctor { Id = doctorAId, TenantId = tenantA, Name = "Dr. Alice", Specialty = "Dermatology" };
        await seedDb.Doctors.AddAsync(docA);
        await seedDb.SaveChangesAsync();

        // Act - Attempt deletion as Receptionist within same Tenant A
        var (_, uowReceptionist, currentUserMockReceptionist) = CreateTestContext(tenantId: tenantA, role: "Receptionist", isSuperAdmin: false, dbName: dbName);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileServiceMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uowReceptionist, currentUserMockReceptionist.Object, saasMock.Object, fileServiceMock.Object);

        // Assert - Denied with UnauthorizedActionException
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(new DeleteDoctorCommand(doctorAId), CancellationToken.None));
    }

    [Fact]
    public async Task Test8_GlobalFilterDefenseInDepth_PreventsForeignDoctorRetrieval()
    {
        // Arrange
        var dbName = $"DocDelDb_Test8_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorBId = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: "SuperAdmin", isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docB = new Doctor { Id = doctorBId, TenantId = tenantB, Name = "Dr. Bob", Specialty = "Cardiology" };
        await seedDb.Doctors.AddAsync(docB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A via repository GetByIdAsync
        var (_, uowA, _) = CreateTestContext(tenantId: tenantA, role: "Admin", isSuperAdmin: false, dbName: dbName);
        var doctor = await uowA.Doctors.GetByIdAsync(doctorBId, CancellationToken.None);

        // Assert - Filtered out at EF Core query level
        Assert.Null(doctor);
    }
}
