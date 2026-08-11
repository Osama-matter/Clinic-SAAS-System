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
        var tenantId = request.TenantId ?? _tenantProvider.TenantId;
        if (!tenantId.HasValue)
            throw new DomainException("Tenant ID is required to cancel an appointment.");

        var appointments = await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted && a.TenantId == tenantId.Value && a.BookingReference == request.BookingReference)
            .ToListAsync(cancellationToken);

        var appointment = appointments.FirstOrDefault()
            ?? throw new NotFoundException("Appointment", request.BookingReference);

        // Verify phone matches
        var phone = appointment.User?.PhoneNumber ?? appointment.PatientPhone;
        if (!string.Equals(phone, request.Phone, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedActionException("Phone number does not match the booking.");

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
