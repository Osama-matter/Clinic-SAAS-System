using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Services;
using ClinicBookingSystem.Infrastructure.Services.Background;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class BackgroundJobSecurityTests
{
    private readonly Guid _tenantA = Guid.NewGuid();
    private readonly Guid _tenantB = Guid.NewGuid();
    private readonly string _sharedDbName = $"BgJobDb_{Guid.NewGuid():N}";

    private Guid _apptAId;
    private Guid _apptBId;

    public BackgroundJobSecurityTests()
    {
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        using var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);

        var plan = new Plan { Name = "Standard", Price = 50, DurationDays = 365, MaxDoctors = 50, MaxPatients = 500, MaxBookings = 5000, IsActive = true };
        dbContext.Plans.Add(plan);

        var subA = new ClinicSubscription { ClinicId = _tenantA, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) };
        var subB = new ClinicSubscription { ClinicId = _tenantB, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) };
        dbContext.ClinicSubscriptions.AddRange(subA, subB);

        var doctorA = new Doctor { TenantId = _tenantA, Name = "Doctor A", Specialty = "General", UserId = Guid.NewGuid() };
        var doctorB = new Doctor { TenantId = _tenantB, Name = "Doctor B", Specialty = "General", UserId = Guid.NewGuid() };

        var apptA = PatientAppointment.CreatePublic(
            _tenantA,
            doctorA.Id,
            "Patient A",
            "+1111111111",
            "patientA@test.com",
            DateTime.UtcNow.AddMinutes(45), // Within 1 hour window
            "Complaint A"
        );
        apptA.Status = AppointmentStatus.Confirmed;

        var apptB = PatientAppointment.CreatePublic(
            _tenantB,
            doctorB.Id,
            "Patient B",
            "+2222222222",
            "patientB@test.com",
            DateTime.UtcNow.AddMinutes(45), // Within 1 hour window
            "Complaint B"
        );
        apptB.Status = AppointmentStatus.Confirmed;

        dbContext.Doctors.AddRange(doctorA, doctorB);
        dbContext.Appointments.AddRange(apptA, apptB);
        dbContext.SaveChanges();

        _apptAId = apptA.Id;
        _apptBId = apptB.Id;
    }

    [Fact]
    public async Task ReminderJob_WithoutHttpContext_EstablishesExplicitTenantContextAndSendsReminders()
    {
        // Arrange - No HttpContext available in background runner
        var accessorMock = new Mock<IHttpContextAccessor>();
        accessorMock.Setup(a => a.HttpContext).Returns((HttpContext?)null);
        var tenantProvider = new TenantProvider(accessorMock.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProvider);
        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<ReminderJob>>();

        var job = new ReminderJob(dbContext, emailServiceMock.Object, tenantProvider, loggerMock.Object);

        // Act - Run reminder job
        await job.SendRemindersAsync();

        // Assert - Verified that reminders for both tenants were sent with explicit tenant scoping
        emailServiceMock.Verify(e => e.SendReminderAsync(
            "patientA@test.com",
            It.IsAny<string>(),
            It.IsAny<DateTime>(),
            It.IsAny<CancellationToken>()), Times.Once);

        emailServiceMock.Verify(e => e.SendReminderAsync(
            "patientB@test.com",
            It.IsAny<string>(),
            It.IsAny<DateTime>(),
            It.IsAny<CancellationToken>()), Times.Once);

        // Verify notifications were recorded with matching TenantId
        var notifA = await dbContext.Notifications.IgnoreQueryFilters().FirstOrDefaultAsync(n => n.TenantId == _tenantA);
        var notifB = await dbContext.Notifications.IgnoreQueryFilters().FirstOrDefaultAsync(n => n.TenantId == _tenantB);

        Assert.NotNull(notifA);
        Assert.Equal(_tenantA, notifA.TenantId);

        Assert.NotNull(notifB);
        Assert.Equal(_tenantB, notifB.TenantId);
    }

    [Fact]
    public async Task ReminderJob_IsIdempotent_DoesNotDuplicateEmailsOnSubsequentRuns()
    {
        var accessorMock = new Mock<IHttpContextAccessor>();
        var tenantProvider = new TenantProvider(accessorMock.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProvider);
        var emailServiceMock = new Mock<IEmailService>();
        var loggerMock = new Mock<ILogger<ReminderJob>>();

        var job = new ReminderJob(dbContext, emailServiceMock.Object, tenantProvider, loggerMock.Object);

        // Act - Run job twice
        await job.SendRemindersAsync();
        await job.SendRemindersAsync();

        // Assert - Email should only be sent once per appointment
        emailServiceMock.Verify(e => e.SendReminderAsync(
            "patientA@test.com",
            It.IsAny<string>(),
            It.IsAny<DateTime>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AppointmentCleanupJob_CleansExpiredAppointmentsSafely()
    {
        var accessorMock = new Mock<IHttpContextAccessor>();
        var tenantProvider = new TenantProvider(accessorMock.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProvider);
        var loggerMock = new Mock<ILogger<AppointmentCleanupJob>>();

        // Seed an expired appointment
        var expiredAppt = PatientAppointment.CreatePublic(
            _tenantA,
            Guid.NewGuid(),
            "Expired Patient",
            "+3333333333",
            "expired@test.com",
            DateTime.UtcNow.AddHours(-3),
            "Past appointment"
        );
        expiredAppt.Status = AppointmentStatus.Pending;
        dbContext.Appointments.Add(expiredAppt);
        await dbContext.SaveChangesAsync();

        var job = new AppointmentCleanupJob(dbContext, loggerMock.Object);

        // Act
        await job.CleanupExpiredAppointmentsAsync();

        // Assert
        var cleanedAppt = await dbContext.Appointments.IgnoreQueryFilters().FirstAsync(a => a.Id == expiredAppt.Id);
        Assert.Equal(AppointmentStatus.Cancelled, cleanedAppt.Status);
    }
}
