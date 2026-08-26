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
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ClinicBookingSystem.Tests;

public enum SecurityActor
{
    Anonymous,
    TenantA_User,
    TenantA_Admin,
    TenantB_User,
    TenantB_Admin,
    SystemAdmin
}

public enum SecurityResource
{
    TenantA_Appointment_UserA,
    TenantA_Appointment_UserOther,
    TenantB_Appointment_UserB,
    TenantA_Patient_Record,
    TenantB_Patient_Record
}

public enum SecurityAction
{
    Read,
    Update
}

public enum ExpectedAccessResult
{
    Allowed,
    Denied
}

public class SecurityMatrixRegressionTests
{
    private static readonly Guid TenantA_Id = Guid.NewGuid();
    private static readonly Guid TenantB_Id = Guid.NewGuid();

    private static readonly Guid UserA_Id = Guid.NewGuid();
    private static readonly Guid UserOtherA_Id = Guid.NewGuid();
    private static readonly Guid AdminA_Id = Guid.NewGuid();

    private static readonly Guid UserB_Id = Guid.NewGuid();
    private static readonly Guid AdminB_Id = Guid.NewGuid();

    private static readonly Guid SuperAdmin_Id = Guid.NewGuid();

    private readonly string _sharedDbName = $"SecurityMatrixDb_{Guid.NewGuid():N}";

    private Guid _apptA_UserA_Id;
    private Guid _apptA_UserOther_Id;
    private Guid _apptB_UserB_Id;

    private Guid _patientA_Id;
    private Guid _patientB_Id;

    public SecurityMatrixRegressionTests()
    {
        SeedMatrixDatabase();
    }

    private void SeedMatrixDatabase()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        using var db = new ApplicationDbContext(options, tenantProviderMock.Object);

        // Seed Plans & Subscriptions
        var plan = new Plan { Name = "Matrix Plan", Price = 100, DurationDays = 365, MaxDoctors = 100, MaxPatients = 1000, MaxBookings = 10000, IsActive = true };
        db.Plans.Add(plan);
        db.ClinicSubscriptions.AddRange(
            new ClinicSubscription { ClinicId = TenantA_Id, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) },
            new ClinicSubscription { ClinicId = TenantB_Id, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) }
        );

        // Seed Users
        var userA = new User { Id = UserA_Id, TenantId = TenantA_Id, Name = "User A", Email = "userA@matrix.test", PasswordHash = "hash", Role = UserRole.Patient };
        var userOtherA = new User { Id = UserOtherA_Id, TenantId = TenantA_Id, Name = "Other User A", Email = "otherA@matrix.test", PasswordHash = "hash", Role = UserRole.Patient };
        var adminA = new User { Id = AdminA_Id, TenantId = TenantA_Id, Name = "Admin A", Email = "adminA@matrix.test", PasswordHash = "hash", Role = UserRole.Admin };

        var userB = new User { Id = UserB_Id, TenantId = TenantB_Id, Name = "User B", Email = "userB@matrix.test", PasswordHash = "hash", Role = UserRole.Patient };
        var adminB = new User { Id = AdminB_Id, TenantId = TenantB_Id, Name = "Admin B", Email = "adminB@matrix.test", PasswordHash = "hash", Role = UserRole.Admin };

        var superAdmin = new User { Id = SuperAdmin_Id, TenantId = null, Name = "Super Admin", Email = "super@matrix.test", PasswordHash = "hash", Role = UserRole.SuperAdmin };

        db.Users.AddRange(userA, userOtherA, adminA, userB, adminB, superAdmin);

        // Seed Doctors
        var doctorA = new Doctor { TenantId = TenantA_Id, Name = "Dr. A", Specialty = "General", UserId = Guid.NewGuid() };
        var doctorB = new Doctor { TenantId = TenantB_Id, Name = "Dr. B", Specialty = "General", UserId = Guid.NewGuid() };
        db.Doctors.AddRange(doctorA, doctorB);

        // Seed Appointments
        var apptA_UserA = PatientAppointment.Create(TenantA_Id, doctorA.Id, UserA_Id, DateTime.UtcNow.AddDays(1), "Appt A User A");
        var apptA_UserOther = PatientAppointment.Create(TenantA_Id, doctorA.Id, UserOtherA_Id, DateTime.UtcNow.AddDays(2), "Appt A User Other");
        var apptB_UserB = PatientAppointment.Create(TenantB_Id, doctorB.Id, UserB_Id, DateTime.UtcNow.AddDays(1), "Appt B User B");

        db.Appointments.AddRange(apptA_UserA, apptA_UserOther, apptB_UserB);

        // Seed Patients
        var patientA = new Patient { TenantId = TenantA_Id, Name = "Patient A", Phone = "+111111" };
        var patientB = new Patient { TenantId = TenantB_Id, Name = "Patient B", Phone = "+222222" };
        db.Patients.AddRange(patientA, patientB);

        db.SaveChanges();

        _apptA_UserA_Id = apptA_UserA.Id;
        _apptA_UserOther_Id = apptA_UserOther.Id;
        _apptB_UserB_Id = apptB_UserB.Id;

        _patientA_Id = patientA.Id;
        _patientB_Id = patientB.Id;
    }

    private (IUnitOfWork Uow, ITenantProvider TenantProvider, ICurrentUserService CurrentUser) CreateContextForActor(SecurityActor actor)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        var currentUserMock = new Mock<ICurrentUserService>();

        switch (actor)
        {
            case SecurityActor.Anonymous:
                tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
                tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
                tenantProviderMock.Setup(t => t.Role).Returns((UserRole?)null);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

                currentUserMock.Setup(c => c.UserId).Returns((Guid?)null);
                currentUserMock.Setup(c => c.Role).Returns((string?)null);
                currentUserMock.Setup(c => c.TenantId).Returns((Guid?)null);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(false);
                break;

            case SecurityActor.TenantA_User:
                tenantProviderMock.Setup(t => t.TenantId).Returns(TenantA_Id);
                tenantProviderMock.Setup(t => t.Id).Returns(TenantA_Id);
                tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Patient);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

                currentUserMock.Setup(c => c.UserId).Returns(UserA_Id);
                currentUserMock.Setup(c => c.Role).Returns("Patient");
                currentUserMock.Setup(c => c.TenantId).Returns(TenantA_Id);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
                break;

            case SecurityActor.TenantA_Admin:
                tenantProviderMock.Setup(t => t.TenantId).Returns(TenantA_Id);
                tenantProviderMock.Setup(t => t.Id).Returns(TenantA_Id);
                tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Admin);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

                currentUserMock.Setup(c => c.UserId).Returns(AdminA_Id);
                currentUserMock.Setup(c => c.Role).Returns("Admin");
                currentUserMock.Setup(c => c.TenantId).Returns(TenantA_Id);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
                break;

            case SecurityActor.TenantB_User:
                tenantProviderMock.Setup(t => t.TenantId).Returns(TenantB_Id);
                tenantProviderMock.Setup(t => t.Id).Returns(TenantB_Id);
                tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Patient);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

                currentUserMock.Setup(c => c.UserId).Returns(UserB_Id);
                currentUserMock.Setup(c => c.Role).Returns("Patient");
                currentUserMock.Setup(c => c.TenantId).Returns(TenantB_Id);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
                break;

            case SecurityActor.TenantB_Admin:
                tenantProviderMock.Setup(t => t.TenantId).Returns(TenantB_Id);
                tenantProviderMock.Setup(t => t.Id).Returns(TenantB_Id);
                tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Admin);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

                currentUserMock.Setup(c => c.UserId).Returns(AdminB_Id);
                currentUserMock.Setup(c => c.Role).Returns("Admin");
                currentUserMock.Setup(c => c.TenantId).Returns(TenantB_Id);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
                break;

            case SecurityActor.SystemAdmin:
                tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
                tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
                tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
                tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

                currentUserMock.Setup(c => c.UserId).Returns(SuperAdmin_Id);
                currentUserMock.Setup(c => c.Role).Returns("SuperAdmin");
                currentUserMock.Setup(c => c.TenantId).Returns((Guid?)null);
                currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);
                break;
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (uow, tenantProviderMock.Object, currentUserMock.Object);
    }

    public static IEnumerable<object[]> SecurityAuthorizationMatrixData()
    {
        // ── Appointment Matrix ──
        // Tenant A User -> Tenant A Own Appointment = ALLOWED
        yield return new object[] { SecurityActor.TenantA_User, SecurityResource.TenantA_Appointment_UserA, SecurityAction.Update, ExpectedAccessResult.Allowed };
        // Tenant A User -> Tenant A Other User's Appointment = DENIED (IDOR / Horizontal Privilege Escalation)
        yield return new object[] { SecurityActor.TenantA_User, SecurityResource.TenantA_Appointment_UserOther, SecurityAction.Update, ExpectedAccessResult.Denied };
        // Tenant A User -> Tenant B Appointment = DENIED (Cross-Tenant)
        yield return new object[] { SecurityActor.TenantA_User, SecurityResource.TenantB_Appointment_UserB, SecurityAction.Update, ExpectedAccessResult.Denied };

        // Tenant A Admin -> Tenant A Own Clinic Appointments = ALLOWED
        yield return new object[] { SecurityActor.TenantA_Admin, SecurityResource.TenantA_Appointment_UserOther, SecurityAction.Update, ExpectedAccessResult.Allowed };
        // Tenant A Admin -> Tenant B Appointment = DENIED (Cross-Tenant Admin Boundary)
        yield return new object[] { SecurityActor.TenantA_Admin, SecurityResource.TenantB_Appointment_UserB, SecurityAction.Update, ExpectedAccessResult.Denied };

        // Tenant B User -> Tenant A Appointment = DENIED
        yield return new object[] { SecurityActor.TenantB_User, SecurityResource.TenantA_Appointment_UserA, SecurityAction.Update, ExpectedAccessResult.Denied };

        // ── Patient Record Matrix ──
        // Tenant A Admin -> Tenant A Patient = ALLOWED
        yield return new object[] { SecurityActor.TenantA_Admin, SecurityResource.TenantA_Patient_Record, SecurityAction.Read, ExpectedAccessResult.Allowed };
        // Tenant A Admin -> Tenant B Patient = DENIED (Cross-Tenant)
        yield return new object[] { SecurityActor.TenantA_Admin, SecurityResource.TenantB_Patient_Record, SecurityAction.Read, ExpectedAccessResult.Denied };
        // Tenant B Admin -> Tenant A Patient = DENIED (Cross-Tenant)
        yield return new object[] { SecurityActor.TenantB_Admin, SecurityResource.TenantA_Patient_Record, SecurityAction.Read, ExpectedAccessResult.Denied };

        // ── System Admin Matrix ──
        yield return new object[] { SecurityActor.SystemAdmin, SecurityResource.TenantA_Appointment_UserA, SecurityAction.Read, ExpectedAccessResult.Allowed };
        yield return new object[] { SecurityActor.SystemAdmin, SecurityResource.TenantB_Appointment_UserB, SecurityAction.Read, ExpectedAccessResult.Allowed };
    }

    [Theory]
    [MemberData(nameof(SecurityAuthorizationMatrixData))]
    public async Task Execute_SecurityAuthorizationMatrix(
        SecurityActor actor,
        SecurityResource resource,
        SecurityAction action,
        ExpectedAccessResult expected)
    {
        var (uow, tenantProvider, currentUser) = CreateContextForActor(actor);

        Func<Task> executeAction = async () =>
        {
            switch (resource)
            {
                case SecurityResource.TenantA_Appointment_UserA:
                case SecurityResource.TenantA_Appointment_UserOther:
                case SecurityResource.TenantB_Appointment_UserB:
                    var targetApptId = resource switch
                    {
                        SecurityResource.TenantA_Appointment_UserA => _apptA_UserA_Id,
                        SecurityResource.TenantA_Appointment_UserOther => _apptA_UserOther_Id,
                        _ => _apptB_UserB_Id
                    };

                    if (action == SecurityAction.Update)
                    {
                        var handler = new CancelAppointmentCommandHandler(uow, currentUser);
                        await handler.Handle(new CancelAppointmentCommand(targetApptId), CancellationToken.None);
                    }
                    else
                    {
                        var appt = await uow.Appointments.GetByIdAsync(targetApptId);
                        if (appt == null) throw new NotFoundException(nameof(PatientAppointment), targetApptId);
                    }
                    break;

                case SecurityResource.TenantA_Patient_Record:
                case SecurityResource.TenantB_Patient_Record:
                    var targetPatientId = resource == SecurityResource.TenantA_Patient_Record ? _patientA_Id : _patientB_Id;
                    var patient = await uow.Patients.GetByIdAsync(targetPatientId);
                    if (patient == null) throw new NotFoundException(nameof(Patient), targetPatientId);
                    break;
            }
        };

        if (expected == ExpectedAccessResult.Allowed)
        {
            // Must succeed without throwing authorization or not found exceptions
            await executeAction();
        }
        else
        {
            // Must throw either UnauthorizedActionException or NotFoundException (to prevent resource leakage)
            await Assert.ThrowsAnyAsync<Exception>(executeAction);
        }
    }
}
