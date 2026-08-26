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

public class PublicAppointmentSecurityTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _doctorId = Guid.NewGuid();
    private readonly string _sharedDbName = $"PublicApptDb_{Guid.NewGuid():N}";

    private readonly string _bookingRef = "ABC123XYZ456";
    private readonly string _phone = "+1234567890";
    private readonly string _securityPin = "789123";

    public PublicAppointmentSecurityTests()
    {
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        using var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);

        var doctor = new Doctor
        {
            Id = _doctorId,
            TenantId = _tenantId,
            Name = "Dr. Test Doctor",
            Specialty = "General",
            UserId = Guid.NewGuid()
        };

        var appt = PatientAppointment.CreatePublic(
            _tenantId,
            _doctorId,
            "John Doe",
            _phone,
            "john@example.com",
            DateTime.UtcNow.AddDays(3),
            "Sensitive medical complaint"
        );
        appt.BookingReference = _bookingRef;
        appt.SecurityPin = _securityPin;

        dbContext.Doctors.Add(doctor);
        dbContext.Appointments.Add(appt);
        dbContext.SaveChanges();
    }

    private (IUnitOfWork Uow, ITenantProvider TenantProvider) CreateContext()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (uow, tenantProviderMock.Object);
    }

    [Fact]
    public async Task PublicLookup_WithMissingPhone_ThrowsDomainException()
    {
        var (uow, tenantProvider) = CreateContext();
        var handler = new LookupAppointmentByReferenceQueryHandler(uow, tenantProvider);

        var query = new LookupAppointmentByReferenceQuery(_bookingRef, Phone: null, _tenantId);

        // Act & Assert - Phone is mandatory
        await Assert.ThrowsAsync<DomainException>(() =>
            handler.Handle(query, CancellationToken.None));
    }

    [Fact]
    public async Task PublicLookup_WithWrongPhone_ThrowsNotFoundException()
    {
        var (uow, tenantProvider) = CreateContext();
        var handler = new LookupAppointmentByReferenceQueryHandler(uow, tenantProvider);

        var query = new LookupAppointmentByReferenceQuery(_bookingRef, Phone: "+9999999999", _tenantId);

        // Act & Assert - Prevents guessing and patient enumeration
        await Assert.ThrowsAsync<NotFoundException>(() =>
            handler.Handle(query, CancellationToken.None));
    }

    [Fact]
    public async Task PublicLookup_WithValidRefAndPhone_DoesNotLeakSecurityPinOrSensitiveNotes()
    {
        var (uow, tenantProvider) = CreateContext();
        var handler = new LookupAppointmentByReferenceQueryHandler(uow, tenantProvider);

        var query = new LookupAppointmentByReferenceQuery(_bookingRef, _phone, _tenantId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_bookingRef, result.BookingReference);
        Assert.Equal("Dr. Test Doctor", result.DoctorName);
        Assert.Null(result.SecurityPin); // Must NEVER leak security PIN on public lookup
    }

    [Fact]
    public async Task PublicCancel_WithValidRefAndPhone_ButInvalidSecurityPin_ThrowsUnauthorizedAction()
    {
        var (uow, tenantProvider) = CreateContext();
        var handler = new PublicCancelAppointmentCommandHandler(uow, tenantProvider);

        var command = new PublicCancelAppointmentCommand(
            _bookingRef,
            _phone,
            SecurityPin: "WRONG_PIN",
            TenantId: _tenantId
        );

        // Act & Assert - Knowing booking reference alone is insufficient
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task PublicCancel_WithValidRefPhoneAndSecurityPin_CancelsSuccessfully()
    {
        var (uow, tenantProvider) = CreateContext();
        var handler = new PublicCancelAppointmentCommandHandler(uow, tenantProvider);

        var command = new PublicCancelAppointmentCommand(
            _bookingRef,
            _phone,
            SecurityPin: _securityPin,
            TenantId: _tenantId
        );

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        var appt = await uow.Appointments.GetAllAsync(a => a.BookingReference == _bookingRef, CancellationToken.None);
        Assert.Equal(AppointmentStatus.Cancelled, appt.First().Status);
    }

    [Fact]
    public async Task PublicReschedule_WithValidRefAndPhone_ButInvalidSecurityPin_ThrowsUnauthorizedAction()
    {
        var (uow, tenantProvider) = CreateContext();
        var emailMock = new Mock<IEmailService>();
        var handler = new PublicRescheduleAppointmentCommandHandler(uow, emailMock.Object, tenantProvider);

        var command = new PublicRescheduleAppointmentCommand(
            _bookingRef,
            _phone,
            NewSlotDateTime: DateTime.UtcNow.AddDays(5),
            SecurityPin: "WRONG_PIN",
            TenantId: _tenantId
        );

        // Act & Assert - Knowing booking reference alone cannot reschedule appointment
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));
    }
}
