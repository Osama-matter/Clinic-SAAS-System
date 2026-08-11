using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using Hangfire;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Appointments;

public record UpdateAppointmentStatusCommand(Guid AppointmentId, AppointmentStatus? NewStatus, bool? IsPaid) : IRequest<Unit>;

public class UpdateAppointmentStatusCommandHandler : IRequestHandler<UpdateAppointmentStatusCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;

    public UpdateAppointmentStatusCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser, IEmailService emailService)
    {
        _uow = uow;
        _currentUser = currentUser;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(UpdateAppointmentStatusCommand request, CancellationToken cancellationToken)
    {
        var patientAppointment = await _uow.Appointments.GetByIdAsync(request.AppointmentId, cancellationToken)
            ?? throw new NotFoundException(nameof(PatientAppointment), request.AppointmentId);

        var isAdmin = _currentUser.Role == "Admin" || _currentUser.Role == "2";

        if (request.NewStatus.HasValue)
        {
            var newStatus = request.NewStatus.Value;

            // Validate transition
            bool valid = (patientAppointment.Status, newStatus) switch
            {
                (AppointmentStatus.Pending, AppointmentStatus.Confirmed) => true,
                (AppointmentStatus.Pending, AppointmentStatus.Cancelled) => true,
                (AppointmentStatus.Confirmed, AppointmentStatus.Cancelled) => true,
                (AppointmentStatus.Confirmed, AppointmentStatus.Completed) => true,
                (AppointmentStatus.Rescheduled, AppointmentStatus.Confirmed) => true,
                (AppointmentStatus.Rescheduled, AppointmentStatus.Cancelled) => true,
                _ => isAdmin || _currentUser.Role == "Doctor" || _currentUser.Role == "4" || _currentUser.Role == "Receptionist" || _currentUser.Role == "3"
            };

            if (!valid)
                throw new InvalidStatusTransitionException(patientAppointment.Status.ToString(), newStatus.ToString());

            switch (newStatus)
            {
                case AppointmentStatus.Confirmed:
                    patientAppointment.Confirm();
                    break;
                case AppointmentStatus.Cancelled:
                    patientAppointment.Cancel();
                    break;
                case AppointmentStatus.Completed:
                    patientAppointment.Complete();
                    break;
                default:
                    patientAppointment.Status = newStatus;
                    patientAppointment.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        if (request.IsPaid.HasValue)
        {
            patientAppointment.IsPaid = request.IsPaid.Value;
        }

        await _uow.Appointments.UpdateAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // Notify patient if completed
        if (request.NewStatus == AppointmentStatus.Completed)
        {
            var email = patientAppointment.User?.Email ?? patientAppointment.PatientEmail;
            if (!string.IsNullOrEmpty(email))
            {
                var doctor = await _uow.Doctors.GetByIdAsync(patientAppointment.DoctorId, cancellationToken);
                var doctorName = doctor?.Name ?? "Doctor";

                BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                    emailSvc.SendAsync(email, "Your appointment is completed", 
                    $"<h2>Thank you!</h2><p>Your appointment with Dr. {doctorName} on {patientAppointment.SlotDateTime:MMM dd, yyyy} is now marked as completed.</p>", CancellationToken.None));
            }
        }

        return Unit.Value;
    }
}
