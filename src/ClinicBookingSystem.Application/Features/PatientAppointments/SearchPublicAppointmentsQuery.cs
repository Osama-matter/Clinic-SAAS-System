using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record SearchPublicAppointmentsQuery(string? Name, string? Phone, Guid? TenantId = null) : IRequest<IEnumerable<PublicAppointmentSearchDto>>;

public class SearchPublicAppointmentsQueryHandler : IRequestHandler<SearchPublicAppointmentsQuery, IEnumerable<PublicAppointmentSearchDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ITenantProvider _tenantProvider;

    public SearchPublicAppointmentsQueryHandler(IUnitOfWork uow, ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<IEnumerable<PublicAppointmentSearchDto>> Handle(SearchPublicAppointmentsQuery request, CancellationToken cancellationToken)
    {
        var hasName = !string.IsNullOrWhiteSpace(request.Name);
        var hasPhone = !string.IsNullOrWhiteSpace(request.Phone);

        if (!hasName && !hasPhone)
            throw new DomainException("Please provide a patient name or phone number.");

        var tenantId = request.TenantId ?? _tenantProvider.TenantId;
        if (!tenantId.HasValue)
            throw new DomainException("Tenant ID is required to search public appointments.");

        var normalizedName = request.Name?.Trim().ToLowerInvariant();
        var normalizedPhone = request.Phone?.Trim();

        return await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted && a.TenantId == tenantId.Value &&
                (!hasPhone || a.PatientPhone == normalizedPhone || (a.User != null && a.User.PhoneNumber == normalizedPhone)) &&
                (!hasName ||
                    (a.PatientName != null && a.PatientName.ToLower().Contains(normalizedName!)) ||
                    (a.User != null && a.User.Name.ToLower().Contains(normalizedName!))))
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .Select(a => new PublicAppointmentSearchDto(
                a.Id,
                a.BookingReference,
                a.Doctor.Name,
                a.SlotDateTime,
                a.Status,
                a.CreatedAt,
                a.PatientName ?? a.User!.Name ?? "Patient",
                a.PatientPhone ?? a.User!.PhoneNumber ?? "",
                a.IsPaid
            ))
            .ToListAsync(cancellationToken);
    }
}
