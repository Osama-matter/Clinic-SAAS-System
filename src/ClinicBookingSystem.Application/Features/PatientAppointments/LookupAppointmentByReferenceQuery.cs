using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record LookupAppointmentByReferenceQuery(string? BookingReference, string? Phone, Guid? TenantId = null) : IRequest<PublicAppointmentDto>;

public class LookupAppointmentByReferenceQueryHandler : IRequestHandler<LookupAppointmentByReferenceQuery, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ITenantProvider _tenantProvider;

    public LookupAppointmentByReferenceQueryHandler(IUnitOfWork uow, ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<PublicAppointmentDto> Handle(LookupAppointmentByReferenceQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.BookingReference) || string.IsNullOrWhiteSpace(request.Phone))
            throw new DomainException("Both booking reference and patient phone number are required for appointment lookup.");

        var tenantId = request.TenantId ?? _tenantProvider.TenantId;
        if (!tenantId.HasValue)
            throw new DomainException("Tenant ID is required to lookup appointments.");

        var normalizedPhone = request.Phone.Trim();
        var normalizedRef = request.BookingReference.Trim();

        var appointment = await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted && a.TenantId == tenantId.Value &&
                 a.BookingReference == normalizedRef &&
                 (a.PatientPhone == normalizedPhone || (a.User != null && a.User.PhoneNumber == normalizedPhone)))
            .Include(a => a.Doctor)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Appointment", request.BookingReference);

        return new PublicAppointmentDto(
            appointment.Id,
            appointment.DoctorId,
            appointment.BookingReference,
            appointment.Doctor.Name,
            appointment.SlotDateTime,
            appointment.Status,
            appointment.CreatedAt,
            appointment.IsPaid);
    }
}
