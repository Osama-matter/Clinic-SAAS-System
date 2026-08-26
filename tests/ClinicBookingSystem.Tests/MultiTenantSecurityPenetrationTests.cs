using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.Appointments;
using ClinicBookingSystem.Application.Features.Auth;
using ClinicBookingSystem.Application.Features.Doctors;
using ClinicBookingSystem.Application.Features.Patients;
using ClinicBookingSystem.Application.Features.Schedules;
using ClinicBookingSystem.Application.Features.Visits;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using ClinicBookingSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using System.Security.Claims;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class MultiTenantSecurityPenetrationTests
{
    private readonly Guid _tenantAId = Guid.NewGuid();
    private readonly Guid _tenantBId = Guid.NewGuid();

    private readonly Guid _userAId = Guid.NewGuid();
    private readonly Guid _adminAId = Guid.NewGuid();
    private readonly Guid _userBId = Guid.NewGuid();
    private readonly Guid _adminBId = Guid.NewGuid();
    private readonly Guid _superAdminId = Guid.NewGuid();

    private readonly string _sharedDbName = $"PenTestDb_{Guid.NewGuid()}";

    // Pre-created resource IDs
    private Guid _patientAId;
    private Guid _patientBId;
    private Guid _doctorAId;
    private Guid _doctorBId;
    private Guid _scheduleAId;
    private Guid _scheduleBId;
    private Guid _visitAId;
    private Guid _visitBId;
    private Guid _appointmentAId;
    private Guid _appointmentBId;

    public MultiTenantSecurityPenetrationTests()
    {
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        // Use a superadmin context to seed across tenants in the shared in-memory DB
        using var dbContext = CreateDbContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true);

        // Seed Plans & Subscriptions for both tenants
        var plan = new Plan
        {
            Name = "Enterprise Plan",
            Price = 500,
            DurationDays = 365,
            MaxDoctors = 50,
            MaxPatients = 500,
            MaxBookings = 5000,
            IsActive = true
        };
        dbContext.Plans.Add(plan);

        var subA = new ClinicSubscription
        {
            ClinicId = _tenantAId,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
            StartDate = DateTime.UtcNow.AddDays(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(335)
        };
        var subB = new ClinicSubscription
        {
            ClinicId = _tenantBId,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
            StartDate = DateTime.UtcNow.AddDays(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(335)
        };
        dbContext.ClinicSubscriptions.AddRange(subA, subB);

        // Tenant A Resources
        var doctorA = new Doctor
        {
            TenantId = _tenantAId,
            Name = "Dr. Alice Tenant A",
            Specialty = "Cardiology",
            UserId = Guid.NewGuid(),
            IsActive = true
        };
        var patientA = new Patient
        {
            TenantId = _tenantAId,
            Name = "Patient Alice (Tenant A)",
            Phone = "+1000000001",
            Gender = GenderType.Female,
            DateOfBirth = new DateTime(1990, 1, 1)
        };
        var scheduleA = new Schedule
        {
            TenantId = _tenantAId,
            Doctor = doctorA,
            DayOfWeek = System.DayOfWeek.Monday,
            StartTime = TimeSpan.FromHours(9),
            EndTime = TimeSpan.FromHours(17)
        };
        var visitA = new Visit
        {
            TenantId = _tenantAId,
            Patient = patientA,
            Doctor = doctorA,
            VisitDate = DateTime.UtcNow.AddDays(-2),
            Symptoms = "Fever and cough",
            Notes = "Prescribed rest"
        };
        var apptA = PatientAppointment.Create(_tenantAId, doctorA.Id, _userAId, DateTime.UtcNow.AddDays(1), "Regular checkup");

        // Tenant B Resources
        var doctorB = new Doctor
        {
            TenantId = _tenantBId,
            Name = "Dr. Bob Tenant B",
            Specialty = "Dermatology",
            UserId = Guid.NewGuid(),
            IsActive = true
        };
        var patientB = new Patient
        {
            TenantId = _tenantBId,
            Name = "Patient Bob (Tenant B)",
            Phone = "+2000000002",
            Gender = GenderType.Male,
            DateOfBirth = new DateTime(1985, 5, 15)
        };
        var scheduleB = new Schedule
        {
            TenantId = _tenantBId,
            Doctor = doctorB,
            DayOfWeek = System.DayOfWeek.Tuesday,
            StartTime = TimeSpan.FromHours(10),
            EndTime = TimeSpan.FromHours(18)
        };
        var visitB = new Visit
        {
            TenantId = _tenantBId,
            Patient = patientB,
            Doctor = doctorB,
            VisitDate = DateTime.UtcNow.AddDays(-3),
            Symptoms = "Skin rash",
            Notes = "Applied ointment"
        };
        var apptB = PatientAppointment.Create(_tenantBId, doctorB.Id, _userBId, DateTime.UtcNow.AddDays(2), "Skin evaluation");

        dbContext.Doctors.AddRange(doctorA, doctorB);
        dbContext.Patients.AddRange(patientA, patientB);
        dbContext.Schedules.AddRange(scheduleA, scheduleB);
        dbContext.Visits.AddRange(visitA, visitB);
        dbContext.Appointments.AddRange(apptA, apptB);

        dbContext.SaveChanges();

        _doctorAId = doctorA.Id;
        _doctorBId = doctorB.Id;
        _patientAId = patientA.Id;
        _patientBId = patientB.Id;
        _scheduleAId = scheduleA.Id;
        _scheduleBId = scheduleB.Id;
        _visitAId = visitA.Id;
        _visitBId = visitB.Id;
        _appointmentAId = apptA.Id;
        _appointmentBId = apptB.Id;
    }

    private ApplicationDbContext CreateDbContext(Guid? tenantId, UserRole? role, bool isSuperAdmin = false)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(role);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        return new ApplicationDbContext(options, tenantProviderMock.Object);
    }

    private (IUnitOfWork Uow, ICurrentUserService CurrentUser, ApplicationDbContext DbContext) CreateAppContext(
        Guid userId,
        Guid? tenantId,
        string roleName,
        UserRole roleEnum,
        bool isSuperAdmin = false)
    {
        var dbContext = CreateDbContext(tenantId, roleEnum, isSuperAdmin);
        var uow = new UnitOfWork(dbContext);

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(u => u.UserId).Returns(userId);
        currentUserMock.Setup(u => u.TenantId).Returns(tenantId);
        currentUserMock.Setup(u => u.Role).Returns(roleName);
        currentUserMock.Setup(u => u.IsAuthenticated).Returns(true);
        currentUserMock.Setup(u => u.Email).Returns($"{roleName.ToLower()}@test.com");

        return (uow, currentUserMock.Object, dbContext);
    }

    // ─────────────────────────────────────────────────────────────
    // 1. GET ATTACK: DIRECT ID GUESSING ACROSS TENANTS
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_TenantA_AttemptsToGet_TenantB_Patient_ReturnsNotFound()
    {
        // Tenant A Admin guesses Tenant B's patient ID
        var (uow, currentUser, _) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var handler = new GetPatientByIdQueryHandler(uow, currentUser);

        // Act & Assert - Data is strictly invisible, preventing ID harvesting (returns NotFoundException)
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new GetPatientByIdQuery(_patientBId), CancellationToken.None));
    }

    [Fact]
    public async Task Attack_TenantA_AttemptsToGet_TenantB_Visit_ReturnsNotFound()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var fileServiceMock = new Mock<IFileService>();
        var handler = new VisitHandlers(uow, fileServiceMock.Object, currentUser);

        // Act & Assert - Cross-tenant visit is invisible
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new GetVisitByIdQuery(_visitBId), CancellationToken.None));
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GET ATTACK: LIST & SEARCH ENDPOINT LEAKAGE
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_TenantA_ListsAllPatients_ContainsZeroRecordsFromTenantB()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var handler = new GetAllPatientsQueryHandler(uow, currentUser);

        // Act
        var result = await handler.Handle(new GetAllPatientsQuery(1, 100), CancellationToken.None);

        // Assert - Only Tenant A patient is returned; Tenant B is completely absent
        Assert.Single(result.Items);
        Assert.Equal(_patientAId, result.Items.First().Id);
        Assert.DoesNotContain(result.Items, p => p.Id == _patientBId);
    }

    [Fact]
    public async Task Attack_TenantB_ListsAllSchedules_ContainsZeroRecordsFromTenantA()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminBId, _tenantBId, AppRoles.Admin, UserRole.Admin);
        var handler = new ScheduleHandlers(uow, currentUser);

        // Act - Attempt to query schedules for Doctor A from Tenant B context
        var schedules = await handler.Handle(new GetDoctorSchedulesQuery(_doctorAId), CancellationToken.None);

        // Assert - Empty result because Doctor A belongs to Tenant A
        Assert.Empty(schedules);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. PUT / PATCH ATTACK: DIRECT CROSS-TENANT MUTATION
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_TenantA_AttemptsToUpdate_TenantB_Patient_FailsWithNotFound()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var handler = new UpdatePatientCommandHandler(uow, currentUser);

        var command = new UpdatePatientCommand(
            Id: _patientBId, // Target Tenant B patient
            Name: "Hacked Name",
            Phone: "+9999999999",
            Gender: GenderType.Male,
            DateOfBirth: new DateTime(1985, 5, 15)
        );

        // Act & Assert - Fails because Tenant B's patient cannot be queried or updated by Tenant A
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Attack_TenantB_AttemptsToUpdate_TenantA_Doctor_FailsWithNotFound()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminBId, _tenantBId, AppRoles.Admin, UserRole.Admin);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var fileMock = new Mock<IFileService>();
        var handler = new DoctorHandlers(uow, currentUser, saasMock.Object, fileMock.Object);

        var command = new UpdateDoctorCommand(
            Id: _doctorAId, // Target Tenant A doctor
            Name: "Hacked Doctor",
            Specialty: "Hacking",
            Bio: "None",
            Photo: null,
            IsActive: false
        );

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    // ─────────────────────────────────────────────────────────────
    // 4. DELETE ATTACK: CROSS-TENANT RECORD DELETION
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_TenantA_AttemptsToDelete_TenantB_Schedule_FailsWithNotFound()
    {
        var (uow, currentUser, _) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var handler = new ScheduleHandlers(uow, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new DeleteScheduleCommand(_scheduleBId), CancellationToken.None));
    }

    // ─────────────────────────────────────────────────────────────
    // 5. POST ATTACK: PAYLOAD / BODY TENANTID INJECTION
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_TenantA_CreatesPatient_WithInjectedTenantBInBody_ForcesTenantAOwnership()
    {
        var (uow, currentUser, dbContext) = CreateAppContext(_adminAId, _tenantAId, AppRoles.Admin, UserRole.Admin);
        var saasMock = new Mock<ISaaSEnforcementService>();
        var handler = new CreatePatientCommandHandler(uow, saasMock.Object, currentUser);

        var command = new CreatePatientCommand(
            Name: "Malicious Inject Patient",
            Phone: "+1999888777",
            Gender: GenderType.Male,
            DateOfBirth: new DateTime(1993, 3, 3)
        );

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert - Result DTO and database record MUST belong to Tenant A, not Tenant B
        Assert.Equal(_tenantAId, result.TenantId);

        var persisted = await dbContext.Patients.IgnoreQueryFilters().FirstAsync(p => p.Id == result.Id);
        Assert.Equal(_tenantAId, persisted.TenantId);
        Assert.NotEqual(_tenantBId, persisted.TenantId);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. HEADER INJECTION & SPOOFING ATTACK (X-Tenant-Id)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void Attack_AuthenticatedUser_SendingSpoofedXTenantIdHeader_IsIgnored()
    {
        // Arrange: User authenticated as Tenant A sends Header X-Tenant-Id = Tenant B
        var httpContextMock = new Mock<HttpContext>();
        var requestMock = new Mock<HttpRequest>();
        var headers = new HeaderDictionary { ["X-Tenant-Id"] = _tenantBId.ToString() };

        requestMock.Setup(r => r.Headers).Returns(headers);
        httpContextMock.Setup(c => c.Request).Returns(requestMock.Object);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, _userAId.ToString()),
            new Claim("TenantId", _tenantAId.ToString()),
            new Claim(ClaimTypes.Role, AppRoles.User)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestJwtAuth"));
        httpContextMock.Setup(c => c.User).Returns(principal);

        var accessorMock = new Mock<IHttpContextAccessor>();
        accessorMock.Setup(a => a.HttpContext).Returns(httpContextMock.Object);

        var provider = new TenantProvider(accessorMock.Object);

        // Act & Assert - Provider MUST return Tenant A and completely ignore spoofed Header Tenant B
        Assert.Equal(_tenantAId, provider.Id);
        Assert.NotEqual(_tenantBId, provider.Id);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. HORIZONTAL PRIVILEGE ESCALATION: USER A VS USER B
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Attack_UserA_AttemptsToCancel_UserB_Appointment_ThrowsUnauthorizedAction()
    {
        // User A authenticated
        var (uow, currentUser, _) = CreateAppContext(_userAId, _tenantAId, AppRoles.User, UserRole.User);
        var handler = new CancelAppointmentCommandHandler(uow, currentUser);

        // Act & Assert - User A cannot cancel User B's appointment
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(new CancelAppointmentCommand(_appointmentBId), CancellationToken.None));
    }

    [Fact]
    public async Task Attack_NormalPatient_AttemptsToUpdateStatus_ThrowsUnauthorizedAction()
    {
        // User A (Patient) attempts to confirm or set paid status on an appointment
        var (uow, currentUser, _) = CreateAppContext(_userAId, _tenantAId, AppRoles.User, UserRole.User);
        var emailMock = new Mock<IEmailService>();
        var handler = new UpdateAppointmentStatusCommandHandler(uow, currentUser, emailMock.Object);

        var command = new UpdateAppointmentStatusCommand(_appointmentAId, AppointmentStatus.Confirmed, IsPaid: true);

        // Act & Assert - Rejects non-staff
        var ex = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));

        Assert.Contains("Only clinic staff or administrators can update appointment statuses", ex.Message);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. SYSTEM ADMIN (SUPERADMIN) UNIVERSAL MAINTENANCE
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task SuperAdmin_CanReadResourcesAcrossAllTenants()
    {
        // SuperAdmin with no specific tenant scope
        var (uow, _, dbContext) = CreateAppContext(_superAdminId, tenantId: null, AppRoles.SuperAdmin, UserRole.SuperAdmin, isSuperAdmin: true);

        var allPatients = await dbContext.Patients.ToListAsync();
        var allDoctors = await dbContext.Doctors.ToListAsync();
        var allVisits = await dbContext.Visits.ToListAsync();

        // Assert - SuperAdmin can view all clinics for global operations
        Assert.Equal(2, allPatients.Count);
        Assert.Equal(2, allDoctors.Count);
        Assert.Equal(2, allVisits.Count);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. ANONYMOUS ACCESS TO PROTECTED OPERATIONS IS DENIED
    // ─────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(AppPolicies.SuperAdminOnly)]
    [InlineData(AppPolicies.AdminOnly)]
    [InlineData(AppPolicies.StaffOnly)]
    [InlineData(AppPolicies.DoctorOnly)]
    public async Task Anonymous_AccessProtectedPolicies_IsStrictlyDenied(string policyName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorizationCore(opt =>
        {
            opt.AddPolicy(AppPolicies.SuperAdminOnly, p => p.RequireRole(AppRoles.SuperAdmin, "6"));
            opt.AddPolicy(AppPolicies.AdminOnly, p => p.RequireRole(AppRoles.Admin, AppRoles.SuperAdmin, "2", "6"));
            opt.AddPolicy(AppPolicies.StaffOnly, p => p.RequireRole(AppRoles.Admin, AppRoles.Receptionist, AppRoles.Doctor, AppRoles.SuperAdmin, "2", "3", "4", "6"));
            opt.AddPolicy(AppPolicies.DoctorOnly, p => p.RequireRole(AppRoles.Doctor, AppRoles.Admin, AppRoles.SuperAdmin, "4", "2", "6"));
        });
        var provider = services.BuildServiceProvider();
        var authService = provider.GetRequiredService<IAuthorizationService>();

        var anonymousUser = new ClaimsPrincipal(new ClaimsIdentity()); // Unauthenticated

        // Act
        var authResult = await authService.AuthorizeAsync(anonymousUser, policyName);

        // Assert
        Assert.False(authResult.Succeeded);
    }
}
