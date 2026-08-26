using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record PublicCancelAppointmentCommand(
    string BookingReference,
    string Phone,
    string? SecurityPin = null,
    Guid? TenantId = null
) : IRequest<Unit>;

public class PublicCancelAppointmentCommandHandler : IRequestHandler<PublicCancelAppointmentCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ITenantProvider _tenantProvider;

    public PublicCancelAppointmentCommandHandler(IUnitOfWork uow, ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<Unit> Handle(PublicCancelAppointmentCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.BookingReference) || string.IsNullOrWhiteSpace(request.Phone))
            throw new DomainException("Booking reference and phone number are required.");

        var tenantId = request.TenantId ?? _tenantProvider.TenantId;
        if (!tenantId.HasValue)
            throw new DomainException("Tenant ID is required to cancel an appointment.");

        var normalizedPhone = request.Phone.Trim();
        var normalizedRef = request.BookingReference.Trim();

        var appointments = await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted && a.TenantId == tenantId.Value && a.BookingReference == normalizedRef)
            .ToListAsync(cancellationToken);

        var appointment = appointments.FirstOrDefault()
            ?? throw new NotFoundException("Appointment", request.BookingReference);

        // Verify phone matches
        var phone = appointment.User?.PhoneNumber ?? appointment.PatientPhone;
        if (!string.Equals(phone, normalizedPhone, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedActionException("Phone number does not match the booking.");

        // Verify SecurityPin if set on appointment
        if (!string.IsNullOrWhiteSpace(appointment.SecurityPin))
        {
            if (string.IsNullOrWhiteSpace(request.SecurityPin) ||
                !string.Equals(appointment.SecurityPin.Trim(), request.SecurityPin.Trim(), StringComparison.Ordinal))
            {
                throw new UnauthorizedActionException("Invalid security verification PIN.");
            }
        }

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new DomainException("This appointment is already cancelled.");

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancelledAt = DateTime.UtcNow;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(appointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
