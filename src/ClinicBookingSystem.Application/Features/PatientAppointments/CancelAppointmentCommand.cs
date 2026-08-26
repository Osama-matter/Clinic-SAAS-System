using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record CancelAppointmentCommand(Guid AppointmentId) : IRequest<Unit>;

public class CancelAppointmentCommandHandler : IRequestHandler<CancelAppointmentCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CancelAppointmentCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(CancelAppointmentCommand request, CancellationToken cancellationToken)
    {
        var patientAppointment = await _uow.Appointments.GetByIdAsync(request.AppointmentId, cancellationToken)
            ?? throw new NotFoundException(nameof(PatientAppointment), request.AppointmentId);

        var isStaffOrAdmin = _currentUser.Role == "Admin" || _currentUser.Role == "2" ||
                             _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6" ||
                             _currentUser.Role == "Receptionist" || _currentUser.Role == "3";
        var isOwner = patientAppointment.UserId == _currentUser.UserId;

        if (!isStaffOrAdmin && !isOwner)
            throw new UnauthorizedActionException("You are not authorized to cancel this appointment.");

        patientAppointment.Status = AppointmentStatus.Cancelled;
        patientAppointment.CancelledAt = DateTime.UtcNow;
        patientAppointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
