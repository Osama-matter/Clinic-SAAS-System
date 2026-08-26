using ClinicBookingSystem.Application.Features.Appointments;
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

public class AppointmentSearchSecurityTests
{
    private (ApplicationDbContext DbContext, IUnitOfWork UnitOfWork, Mock<ITenantProvider> TenantProviderMock) CreateTestContext(
        Guid? tenantId,
        UserRole? role = UserRole.Receptionist,
        bool isSuperAdmin = false,
        string? dbName = null)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(role);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? $"ApptSearchSecDb_{Guid.NewGuid()}")
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow, tenantProviderMock);
    }

    private async Task SeedActiveSubscriptionAsync(ApplicationDbContext dbContext, Guid clinicId)
    {
        var plan = new Plan
        {
            Name = $"Test Plan {Guid.NewGuid()}",
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
    public async Task Test1_TenantA_CannotSearch_TenantB_Appointments()
    {
        // Arrange
        var dbName = $"ApptSearchDb_Test1_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorIdA = Guid.NewGuid();
        var doctorIdB = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docA = new Doctor { Id = doctorIdA, TenantId = tenantA, Name = "Dr. Alpha", Specialty = "Cardiology" };
        var docB = new Doctor { Id = doctorIdB, TenantId = tenantB, Name = "Dr. Beta", Specialty = "Dermatology" };

        var apptA = new PatientAppointment
        {
            TenantId = tenantA,
            DoctorId = doctorIdA,
            PatientName = "John Doe",
            PatientPhone = "01011111111",
            BookingReference = "REF-A1",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        var apptB = new PatientAppointment
        {
            TenantId = tenantB,
            DoctorId = doctorIdB,
            PatientName = "John Doe",
            PatientPhone = "01022222222",
            BookingReference = "REF-B1",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        await seedDb.Doctors.AddRangeAsync(docA, docB);
        await seedDb.Appointments.AddRangeAsync(apptA, apptB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A Staff
        var (_, uowA, tenantProviderMockA) = CreateTestContext(tenantA, role: UserRole.Receptionist, isSuperAdmin: false, dbName: dbName);
        var handler = new SearchPublicAppointmentsQueryHandler(uowA, tenantProviderMockA.Object);

        var results = (await handler.Handle(new SearchPublicAppointmentsQuery("John", null), CancellationToken.None)).ToList();

        // Assert - Only Tenant A appointment returned
        Assert.Single(results);
        Assert.Equal("REF-A1", results[0].BookingReference);
        Assert.Equal("Dr. Alpha", results[0].DoctorName);
        Assert.DoesNotContain(results, a => a.BookingReference == "REF-B1");
    }

    [Fact]
    public async Task Test2_TenantB_CannotSearch_TenantA_Appointments_Bidirectional()
    {
        // Arrange
        var dbName = $"ApptSearchDb_Test2_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorIdA = Guid.NewGuid();
        var doctorIdB = Guid.NewGuid();

        // Seed with SuperAdmin
        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docA = new Doctor { Id = doctorIdA, TenantId = tenantA, Name = "Dr. Alpha", Specialty = "Cardiology" };
        var docB = new Doctor { Id = doctorIdB, TenantId = tenantB, Name = "Dr. Beta", Specialty = "Dermatology" };

        var apptA = new PatientAppointment
        {
            TenantId = tenantA,
            DoctorId = doctorIdA,
            PatientName = "Sarah Connor",
            PatientPhone = "01011111111",
            BookingReference = "REF-A-SARAH",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        var apptB = new PatientAppointment
        {
            TenantId = tenantB,
            DoctorId = doctorIdB,
            PatientName = "Sarah Connor",
            PatientPhone = "01022222222",
            BookingReference = "REF-B-SARAH",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        await seedDb.Doctors.AddRangeAsync(docA, docB);
        await seedDb.Appointments.AddRangeAsync(apptA, apptB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant B Doctor
        var (_, uowB, tenantProviderMockB) = CreateTestContext(tenantB, role: UserRole.Doctor, isSuperAdmin: false, dbName: dbName);
        var handler = new SearchPublicAppointmentsQueryHandler(uowB, tenantProviderMockB.Object);

        var results = (await handler.Handle(new SearchPublicAppointmentsQuery("Sarah", null), CancellationToken.None)).ToList();

        // Assert - Only Tenant B appointment returned
        Assert.Single(results);
        Assert.Equal("REF-B-SARAH", results[0].BookingReference);
        Assert.Equal("Dr. Beta", results[0].DoctorName);
        Assert.DoesNotContain(results, a => a.BookingReference == "REF-A-SARAH");
    }

    [Fact]
    public async Task Test3_IdenticalPatientData_AcrossTenants_EnforcesTenantBoundary()
    {
        // Arrange
        var dbName = $"ApptSearchDb_Test3_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorIdA = Guid.NewGuid();
        var doctorIdB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docA = new Doctor { Id = doctorIdA, TenantId = tenantA, Name = "Dr. Alpha", Specialty = "Cardiology" };
        var docB = new Doctor { Id = doctorIdB, TenantId = tenantB, Name = "Dr. Beta", Specialty = "Dermatology" };

        var apptA = new PatientAppointment
        {
            TenantId = tenantA,
            DoctorId = doctorIdA,
            PatientName = "Common Name",
            PatientPhone = "01000000000",
            BookingReference = "REF-COMMON-A",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        var apptB = new PatientAppointment
        {
            TenantId = tenantB,
            DoctorId = doctorIdB,
            PatientName = "Common Name",
            PatientPhone = "01000000000",
            BookingReference = "REF-COMMON-B",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        await seedDb.Doctors.AddRangeAsync(docA, docB);
        await seedDb.Appointments.AddRangeAsync(apptA, apptB);
        await seedDb.SaveChangesAsync();

        // Act - Query as Tenant A Admin by phone
        var (_, uowA, tenantProviderMockA) = CreateTestContext(tenantA, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var handler = new SearchPublicAppointmentsQueryHandler(uowA, tenantProviderMockA.Object);

        var results = (await handler.Handle(new SearchPublicAppointmentsQuery(null, "01000000000"), CancellationToken.None)).ToList();

        // Assert
        Assert.Single(results);
        Assert.Equal("REF-COMMON-A", results[0].BookingReference);
    }

    [Fact]
    public async Task Test4_MissingTenantContext_FailsClosed_ThrowsUnauthorizedActionException()
    {
        // Arrange
        var dbName = $"ApptSearchDb_Test4_{Guid.NewGuid()}";
        var (_, uowNoTenant, tenantProviderMockNoTenant) = CreateTestContext(
            tenantId: null,
            role: UserRole.Receptionist,
            isSuperAdmin: false,
            dbName: dbName);

        var handler = new SearchPublicAppointmentsQueryHandler(uowNoTenant, tenantProviderMockNoTenant.Object);

        // Act & Assert - Calling search with missing tenant context must fail closed
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(new SearchPublicAppointmentsQuery("John", null), CancellationToken.None));
    }

    [Fact]
    public async Task Test5_SuperAdmin_CanSearchGlobally_OrTargetSpecificTenant()
    {
        // Arrange
        var dbName = $"ApptSearchDb_Test5_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var doctorIdA = Guid.NewGuid();
        var doctorIdB = Guid.NewGuid();

        var (seedDb, _, _) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        await SeedActiveSubscriptionAsync(seedDb, tenantA);
        await SeedActiveSubscriptionAsync(seedDb, tenantB);

        var docA = new Doctor { Id = doctorIdA, TenantId = tenantA, Name = "Dr. Alpha", Specialty = "Cardiology" };
        var docB = new Doctor { Id = doctorIdB, TenantId = tenantB, Name = "Dr. Beta", Specialty = "Dermatology" };

        var apptA = new PatientAppointment
        {
            TenantId = tenantA,
            DoctorId = doctorIdA,
            PatientName = "Global Search Patient",
            PatientPhone = "01011111111",
            BookingReference = "REF-SUPER-A",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        var apptB = new PatientAppointment
        {
            TenantId = tenantB,
            DoctorId = doctorIdB,
            PatientName = "Global Search Patient",
            PatientPhone = "01022222222",
            BookingReference = "REF-SUPER-B",
            SlotDateTime = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Confirmed
        };

        await seedDb.Doctors.AddRangeAsync(docA, docB);
        await seedDb.Appointments.AddRangeAsync(apptA, apptB);
        await seedDb.SaveChangesAsync();

        // Act - SuperAdmin with null tenant retrieves global appointments
        var (_, uowSuper, tenantProviderMockSuper) = CreateTestContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var handler = new SearchPublicAppointmentsQueryHandler(uowSuper, tenantProviderMockSuper.Object);

        var results = (await handler.Handle(new SearchPublicAppointmentsQuery("Global Search Patient", null), CancellationToken.None)).ToList();

        // Assert - Both appointments returned for SuperAdmin
        Assert.Equal(2, results.Count);
        Assert.Contains(results, a => a.BookingReference == "REF-SUPER-A");
        Assert.Contains(results, a => a.BookingReference == "REF-SUPER-B");
    }

    [Fact]
    public async Task Test6_EmptySearchQuery_ThrowsDomainException()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var (_, uowA, tenantProviderMockA) = CreateTestContext(tenantA, role: UserRole.Receptionist, isSuperAdmin: false);
        var handler = new SearchPublicAppointmentsQueryHandler(uowA, tenantProviderMockA.Object);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            handler.Handle(new SearchPublicAppointmentsQuery(null, null), CancellationToken.None));
    }
}
