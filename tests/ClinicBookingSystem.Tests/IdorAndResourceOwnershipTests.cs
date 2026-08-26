using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.Appointments;
using ClinicBookingSystem.Application.Features.Doctors;
using ClinicBookingSystem.Application.Features.Notifications;
using ClinicBookingSystem.Application.Features.Schedules;
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

public class IdorAndResourceOwnershipTests
{
    private readonly Guid _tenantAId = Guid.NewGuid();
    private readonly Guid _tenantBId = Guid.NewGuid();
    private readonly Guid _userAId = Guid.NewGuid();
    private readonly Guid _userBId = Guid.NewGuid();
    private readonly string _sharedDbName = $"IdorDb_{Guid.NewGuid()}";

    private Guid _notifAId;
    private Guid _notifBId;
    private Guid _doctorAId;
    private Guid _doctorBId;
    private Guid _apptAId;
    private Guid _apptBId;

    public IdorAndResourceOwnershipTests()
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

        // Notifications
        var notifA = new Notification { TenantId = _tenantAId, UserId = _userAId, Message = "Notice A" };
        var notifB = new Notification { TenantId = _tenantBId, UserId = _userBId, Message = "Notice B" };

        // Doctors & Appointments
        var doctorA = new Doctor { TenantId = _tenantAId, Name = "Doctor A", Specialty = "General", UserId = Guid.NewGuid() };
        var doctorB = new Doctor { TenantId = _tenantBId, Name = "Doctor B", Specialty = "General", UserId = Guid.NewGuid() };

        var apptA = PatientAppointment.Create(_tenantAId, doctorA.Id, _userAId, DateTime.UtcNow.AddDays(1), "Notes A");
        var apptB = PatientAppointment.Create(_tenantBId, doctorB.Id, _userBId, DateTime.UtcNow.AddDays(2), "Notes B");

        dbContext.Notifications.AddRange(notifA, notifB);
        dbContext.Doctors.AddRange(doctorA, doctorB);
        dbContext.Appointments.AddRange(apptA, apptB);
        dbContext.SaveChanges();

        _notifAId = notifA.Id;
        _notifBId = notifB.Id;
        _doctorAId = doctorA.Id;
        _doctorBId = doctorB.Id;
        _apptAId = apptA.Id;
        _apptBId = apptB.Id;
    }

    private (IUnitOfWork Uow, ICurrentUserService CurrentUser) CreateContext(Guid userId, Guid? tenantId, string role)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(Enum.TryParse<UserRole>(role, out var r) ? r : null);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(role == AppRoles.SuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(u => u.UserId).Returns(userId);
        currentUserMock.Setup(u => u.TenantId).Returns(tenantId);
        currentUserMock.Setup(u => u.Role).Returns(role);
        currentUserMock.Setup(u => u.IsAuthenticated).Returns(true);

        return (uow, currentUserMock.Object);
    }

    [Fact]
    public async Task UserA_AttemptingToMarkUserBNotificationAsRead_ThrowsUnauthorizedOrNotFound()
    {
        // User A attempts to mark User B's notification
        var (uow, currentUser) = CreateContext(_userAId, _tenantAId, AppRoles.User);
        var handler = new MarkNotificationAsReadCommandHandler(uow, currentUser);

        // Act & Assert - Denied by tenant filter or user ownership check
        await Assert.ThrowsAnyAsync<Exception>(() =>
            handler.Handle(new MarkNotificationAsReadCommand(_notifBId), CancellationToken.None));
    }

    [Fact]
    public async Task UserA_MarkingOwnNotificationAsRead_IsAllowed()
    {
        // User A marks User A's notification
        var (uow, currentUser) = CreateContext(_userAId, _tenantAId, AppRoles.User);
        var handler = new MarkNotificationAsReadCommandHandler(uow, currentUser);

        // Act
        await handler.Handle(new MarkNotificationAsReadCommand(_notifAId), CancellationToken.None);

        // Assert
        var notif = await uow.Notifications.GetByIdAsync(_notifAId, CancellationToken.None);
        Assert.NotNull(notif);
        Assert.True(notif.IsRead);
    }

    [Fact]
    public async Task TenantA_Admin_AttemptingToCreateScheduleForTenantBDoctor_ThrowsUnauthorized()
    {
        // Tenant A admin attempts to attach a schedule to Doctor B (who belongs to Tenant B)
        var (uow, currentUser) = CreateContext(Guid.NewGuid(), _tenantAId, AppRoles.Admin);
        var handler = new ScheduleHandlers(uow, currentUser);

        var command = new CreateScheduleCommand(
            DoctorId: _doctorBId,
            DayOfWeek: Domain.Enums.DayOfWeek.Monday,
            StartTime: TimeSpan.FromHours(9),
            EndTime: TimeSpan.FromHours(17),
            SlotDurationMinutes: 30
        );

        // Act & Assert - Rejects attempt to bind schedule across doctor tenant boundary
        await Assert.ThrowsAnyAsync<Exception>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task TenantA_Admin_CreatingScheduleForTenantADoctor_IsAllowed()
    {
        // Tenant A admin creates schedule for Doctor A
        var (uow, currentUser) = CreateContext(Guid.NewGuid(), _tenantAId, AppRoles.Admin);
        var handler = new ScheduleHandlers(uow, currentUser);

        var command = new CreateScheduleCommand(
            DoctorId: _doctorAId,
            DayOfWeek: Domain.Enums.DayOfWeek.Wednesday,
            StartTime: TimeSpan.FromHours(8),
            EndTime: TimeSpan.FromHours(16),
            SlotDurationMinutes: 30
        );

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_doctorAId, result.DoctorId);
    }
}
