using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record GetMyAppointmentsQuery(AppointmentStatus? Status) : IRequest<IEnumerable<AppointmentDto>>;

public class GetMyAppointmentsQueryHandler : IRequestHandler<GetMyAppointmentsQuery, IEnumerable<AppointmentDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyAppointmentsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<IEnumerable<AppointmentDto>> Handle(GetMyAppointmentsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId!.Value;
        var Appointments = await _uow.Appointments.GetAllAsync(
            a => a.UserId == userId && (!request.Status.HasValue || a.Status == request.Status),
            cancellationToken,
            a => a.Doctor);

        return Appointments
            .Select(a => new AppointmentDto(
                a.Id,
                a.DoctorId,
                a.Doctor.Name,
                a.SlotDateTime,
                a.Status,
                a.BookingReference,
                a.Notes,
                a.User?.Name ?? a.PatientName ?? "System User",
                a.User?.PhoneNumber ?? a.PatientPhone ?? "No Phone",
                a.CreatedAt,
                a.IsPaid
            ));
    }
}
