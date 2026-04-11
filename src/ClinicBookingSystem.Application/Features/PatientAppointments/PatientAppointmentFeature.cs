using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using Hangfire;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Appointments;

// ── DTOs ──────────────────────────────────────────────
public record AppointmentDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    string BookingReference,
    string? Notes,
    string PatientName,
    string PatientPhone,
    DateTime CreatedAt,
    bool IsPaid = false
);

public record PublicAppointmentDto(
    Guid Id,
    Guid DoctorId,
    string BookingReference,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    DateTime CreatedAt,
    bool IsPaid = false
);

public record PublicAppointmentSearchDto(
    Guid Id,
    string BookingReference,
    string DoctorName,
    DateTime SlotDateTime,
    AppointmentStatus Status,
    DateTime CreatedAt,
    string PatientName,
    string PatientPhone,
    bool IsPaid = false
);

// ── Commands ──────────────────────────────────────────
public record BookAppointmentCommand(
    Guid DoctorId,
    DateTime SlotDateTime,
    string? Notes
) : IRequest<AppointmentDto>;

public record PublicBookAppointmentCommand(
    string PatientName,
    string PatientPhone,
    string PatientEmail,
    Guid DoctorId,
    DateTime SlotDateTime,
    string? Notes
) : IRequest<PublicAppointmentDto>;

public record PublicCancelAppointmentCommand(
    string BookingReference,
    string Phone
) : IRequest<Unit>;

public record PublicRescheduleAppointmentCommand(
    string BookingReference,
    string Phone,
    DateTime NewSlotDateTime
) : IRequest<PublicAppointmentDto>;

public record UpdateAppointmentStatusCommand(Guid AppointmentId, AppointmentStatus? NewStatus, bool? IsPaid) : IRequest<Unit>;

public record CancelAppointmentCommand(Guid AppointmentId) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetMyAppointmentsQuery(AppointmentStatus? Status) : IRequest<IEnumerable<AppointmentDto>>;

public record LookupAppointmentByReferenceQuery(string? BookingReference, string? Phone) : IRequest<PublicAppointmentDto>;
public record SearchPublicAppointmentsQuery(string? Name, string? Phone) : IRequest<IEnumerable<PublicAppointmentSearchDto>>;

// ── Handlers ──────────────────────────────────────────

// ── Authenticated booking handler ─────────────────────
public class BookAppointmentCommandHandler : IRequestHandler<BookAppointmentCommand, AppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;
    private readonly ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService _saas;

    public BookAppointmentCommandHandler(
        IUnitOfWork uow, 
        ICurrentUserService currentUser, 
        IEmailService emailService,
        ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService saas)
    {
        _uow = uow;
        _currentUser = currentUser;
        _emailService = emailService;
        _saas = saas;
    }

    public async Task<AppointmentDto> Handle(BookAppointmentCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        if (!doctor.IsActive)
            throw new DomainException("Doctor is not active.");

        if (request.SlotDateTime < DateTime.UtcNow)
            throw new DomainException("Cannot book an appointment in the past.");

        var count = await _uow.Appointments.CountAsync(a => a.TenantId == doctor.TenantId, cancellationToken);
        await _saas.CheckLimitAsync(ClinicBookingSystem.Application.Interfaces.SaaSFeatureCodes.AppointmentsLimit, count, cancellationToken);

        // Check if doctor has a schedule for this day
        var schedules = await _uow.Schedules.GetAllAsync(
            s => s.DoctorId == request.DoctorId && s.DayOfWeek == request.SlotDateTime.DayOfWeek,
            cancellationToken);

        var schedule = schedules.FirstOrDefault();
        if (schedule == null)
            throw new DomainException("Doctor is not available on this day.");

        // Check if requested time falls within working hours
        var timeOfDay = request.SlotDateTime.TimeOfDay;
        if (timeOfDay < schedule.StartTime || timeOfDay >= schedule.EndTime)
            throw new DomainException("The requested slot is outside the doctor's working hours.");

        // Check for blocked slots
        if (await _uow.BlockedSlots.AnyAsync(
            b => b.DoctorId == request.DoctorId && request.SlotDateTime >= b.StartTime && request.SlotDateTime < b.EndTime,
            cancellationToken))
            throw new SchedulingConflictException("This time slot is blocked.");

        // Check for existing appointments at this slot (Doctor side)
        if (await _uow.Appointments.AnyAsync(
            a => a.DoctorId == request.DoctorId && a.SlotDateTime == request.SlotDateTime && a.Status != AppointmentStatus.Cancelled,
            cancellationToken))
            throw new SchedulingConflictException("This doctor is already booked for this slot.");

        // Check for existing appointments at this slot (Patient side)
        var userId = _currentUser.UserId!.Value;
        if (await _uow.Appointments.AnyAsync(
            a => a.UserId == userId && a.SlotDateTime == request.SlotDateTime && a.Status != AppointmentStatus.Cancelled,
            cancellationToken))
            throw new SchedulingConflictException("You already have another appointment at this time.");

        var patientAppointment = new PatientAppointment
        {
            TenantId = doctor.TenantId,
            DoctorId = request.DoctorId,
            UserId = _currentUser.UserId!.Value,
            SlotDateTime = request.SlotDateTime,
            Status = AppointmentStatus.Pending,
            BookingReference = GenerateBookingReference(),
            Notes = request.Notes
        };

        await _uow.Appointments.AddAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // ── Notifications ─────────────────────────────────
        var patientName = _currentUser.Email ?? "Patient";
        var notificationMessage = $"New Appointment: {patientName} with Dr. {doctor.Name} on {request.SlotDateTime:MMM dd, HH:mm}";

        // 1. Notify Doctor
        _uow.Notifications.AddAsync(new Notification
        {
            UserId = doctor.UserId,
            Message = notificationMessage,
            Type = NotificationType.InApp
        }, cancellationToken);

        // 2. Notify Admins
        var admins = await _uow.Users.GetAllAsync(u => u.Role == UserRole.Admin, cancellationToken);
        foreach (var admin in admins)
        {
            _uow.Notifications.AddAsync(new Notification
            {
                UserId = admin.Id,
                Message = notificationMessage,
                Type = NotificationType.InApp
            }, cancellationToken);
        }

        // 3. Email Patient (Confirmation)
        var patientEmail = _currentUser.Email;
        if (!string.IsNullOrEmpty(patientEmail))
        {
            BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                emailSvc.SendBookingConfirmationAsync(patientEmail, $"Appointment with Dr. {doctor.Name}", request.SlotDateTime, CancellationToken.None));
        }

        await _uow.SaveChangesAsync(cancellationToken);

        return new AppointmentDto(
            patientAppointment.Id,
            doctor.Id,
            doctor.Name,
            patientAppointment.SlotDateTime,
            patientAppointment.Status,
            patientAppointment.BookingReference,
            patientAppointment.Notes,
            patientName,
            "",
            patientAppointment.CreatedAt,
            patientAppointment.IsPaid);
    }

    private static string GenerateBookingReference()
        => Guid.NewGuid().ToString("N")[..12].ToUpper();
}

// ── Public (guest) booking handler ────────────────────
public class PublicBookAppointmentCommandHandler : IRequestHandler<PublicBookAppointmentCommand, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _emailService;
    private readonly ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService _saas;

    public PublicBookAppointmentCommandHandler(
        IUnitOfWork uow, 
        IEmailService emailService,
        ClinicBookingSystem.Application.Interfaces.ISaaSEnforcementService saas)
    {
        _uow = uow;
        _emailService = emailService;
        _saas = saas;
    }

    public async Task<PublicAppointmentDto> Handle(PublicBookAppointmentCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        if (!doctor.IsActive)
            throw new DomainException("Doctor is not active.");

        if (request.SlotDateTime < DateTime.UtcNow)
            throw new DomainException("Cannot book an appointment in the past.");

        await _saas.CheckFeatureEnabledAsync(ClinicBookingSystem.Application.Interfaces.SaaSFeatureCodes.OnlineBooking, cancellationToken);
        var count = await _uow.Appointments.CountAsync(a => a.TenantId == doctor.TenantId, cancellationToken);
        await _saas.CheckLimitAsync(ClinicBookingSystem.Application.Interfaces.SaaSFeatureCodes.AppointmentsLimit, count, cancellationToken);

        // Check if doctor has a schedule for this day
        var schedules = await _uow.Schedules.GetAllAsync(
            s => s.DoctorId == request.DoctorId && s.DayOfWeek == request.SlotDateTime.DayOfWeek,
            cancellationToken);

        var schedule = schedules.FirstOrDefault();
        if (schedule == null)
            throw new DomainException("Doctor is not available on this day.");

        // Check if requested time falls within working hours
        var timeOfDay = request.SlotDateTime.TimeOfDay;
        if (timeOfDay < schedule.StartTime || timeOfDay >= schedule.EndTime)
            throw new DomainException("The requested slot is outside the doctor's working hours.");

        // Check for blocked slots
        var isBlocked = await _uow.BlockedSlots.GetAllAsync(
            b => b.DoctorId == request.DoctorId && request.SlotDateTime >= b.StartTime && request.SlotDateTime < b.EndTime,
            cancellationToken);

        if (isBlocked.Any())
            throw new SchedulingConflictException("This time slot is blocked.");

        // Check for existing appointments at this slot (Doctor side)
        if (await _uow.Appointments.AnyAsync(
            a => a.DoctorId == request.DoctorId && a.SlotDateTime == request.SlotDateTime && a.Status != AppointmentStatus.Cancelled,
            cancellationToken))
            throw new SchedulingConflictException("This doctor is already booked for this slot.");

        // Check for existing appointments at this slot (Patient side - Guest)
        if (await _uow.Appointments.AnyAsync(
            a => (a.PatientPhone == request.PatientPhone || a.PatientEmail == request.PatientEmail) 
                && a.SlotDateTime == request.SlotDateTime && a.Status != AppointmentStatus.Cancelled,
            cancellationToken))
            throw new SchedulingConflictException("An appointment with this phone or email already exists at this time.");

        var bookingRef = Guid.NewGuid().ToString("N")[..12].ToUpper();

        var patientAppointment = new PatientAppointment
        {
            TenantId = doctor.TenantId,
            DoctorId = request.DoctorId,
            UserId = null, // guest — no login
            SlotDateTime = request.SlotDateTime,
            Status = AppointmentStatus.Pending,
            BookingReference = bookingRef,
            Notes = request.Notes,
            PatientName = request.PatientName,
            PatientPhone = request.PatientPhone,
            PatientEmail = request.PatientEmail
        };

        await _uow.Appointments.AddAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // ── Notifications ─────────────────────────────────
        var patientDispName = request.PatientName ?? "Guest";
        var notificationMessage = $"New Public Booking: {patientDispName} with Dr. {doctor.Name} on {request.SlotDateTime:MMM dd, HH:mm} (Ref: {bookingRef})";

        // 1. Notify Doctor (In-App)
        _uow.Notifications.AddAsync(new Notification
        {
            UserId = doctor.UserId,
            Message = notificationMessage,
            Type = NotificationType.InApp
        }, cancellationToken);

        // 2. Notify Admins (In-App)
        var admins = await _uow.Users.GetAllAsync(u => u.Role == UserRole.Admin, cancellationToken);
        foreach (var admin in admins)
        {
            _uow.Notifications.AddAsync(new Notification
            {
                UserId = admin.Id,
                Message = notificationMessage,
                Type = NotificationType.InApp
            }, cancellationToken);
        }

        // 3. Email Patient (Confirmation)
        var patientEmail = patientAppointment.PatientEmail;
        if (!string.IsNullOrEmpty(patientEmail))
        {
            BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                emailSvc.SendBookingConfirmationAsync(patientEmail, $"Appointment with Dr. {doctor.Name}", request.SlotDateTime, CancellationToken.None));
        }

        await _uow.SaveChangesAsync(cancellationToken);

        return new PublicAppointmentDto(
            patientAppointment.Id,
            doctor.Id,
            bookingRef,
            doctor.Name,
            patientAppointment.SlotDateTime,
            patientAppointment.Status,
            patientAppointment.CreatedAt,
            patientAppointment.IsPaid);
    }
}

// ── Public cancel handler ─────────────────────────────
public class PublicCancelAppointmentCommandHandler : IRequestHandler<PublicCancelAppointmentCommand, Unit>
{
    private readonly IUnitOfWork _uow;

    public PublicCancelAppointmentCommandHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<Unit> Handle(PublicCancelAppointmentCommand request, CancellationToken cancellationToken)
    {
        var appointments = await _uow.Appointments.GetAllAsync(
            a => a.BookingReference == request.BookingReference,
            cancellationToken);

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

// ── Public reschedule handler ─────────────────────────
public class PublicRescheduleAppointmentCommandHandler : IRequestHandler<PublicRescheduleAppointmentCommand, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IEmailService _emailService;

    public PublicRescheduleAppointmentCommandHandler(IUnitOfWork uow, IEmailService emailService)
    {
        _uow = uow;
        _emailService = emailService;
    }

    public async Task<PublicAppointmentDto> Handle(PublicRescheduleAppointmentCommand request, CancellationToken cancellationToken)
    {
        var appointments = await _uow.Appointments.GetAllAsync(
            a => a.BookingReference == request.BookingReference,
            cancellationToken,
            a => a.Doctor);

        var appointment = appointments.FirstOrDefault()
            ?? throw new NotFoundException("Appointment", request.BookingReference);

        // Verify phone
        var phone = appointment.User?.PhoneNumber ?? appointment.PatientPhone;
        if (!string.Equals(phone, request.Phone, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedActionException("Phone number does not match the booking.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new DomainException("Cannot reschedule a cancelled appointment.");

        if (request.NewSlotDateTime < DateTime.UtcNow)
            throw new DomainException("Cannot reschedule an appointment to a time in the past.");

        // Check new slot availability
        if (await _uow.BlockedSlots.AnyAsync(
            b => b.DoctorId == appointment.DoctorId && request.NewSlotDateTime >= b.StartTime && request.NewSlotDateTime < b.EndTime,
            cancellationToken))
            throw new SchedulingConflictException("The new time slot is blocked.");

        if (await _uow.Appointments.AnyAsync(
            a => a.DoctorId == appointment.DoctorId && a.SlotDateTime == request.NewSlotDateTime
                && a.Status != AppointmentStatus.Cancelled && a.Id != appointment.Id,
            cancellationToken))
            throw new SchedulingConflictException("The new slot is already booked.");

        // Store old slot for logging/notification if needed
        var oldSlot = appointment.SlotDateTime;
        
        appointment.SlotDateTime = request.NewSlotDateTime;
        appointment.Status = AppointmentStatus.Rescheduled;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(appointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // ── Notifications ─────────────────────────────────
        var notificationMessage = $"Appointment Rescheduled: Patient {appointment.PatientName ?? appointment.User?.Name} moved from {oldSlot:MMM dd, HH:mm} to {appointment.SlotDateTime:MMM dd, HH:mm} (Ref: {appointment.BookingReference})";

        // 1. Notify Doctor (In-App)
        _uow.Notifications.AddAsync(new Notification
        {
            UserId = appointment.Doctor.UserId,
            Message = notificationMessage,
            Type = NotificationType.InApp
        }, cancellationToken);

        // 2. Notify Patient (Email)
        var patientEmail = appointment.User?.Email ?? appointment.PatientEmail;
        if (!string.IsNullOrEmpty(patientEmail))
        {
            BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                emailSvc.SendAsync(
                    patientEmail, 
                    "Appointment Rescheduled", 
                    $"<h2>Your appointment has been rescheduled</h2><p><strong>Dr. {appointment.Doctor.Name}</strong><br/>New Time: {appointment.SlotDateTime:dddd, MMMM d yyyy HH:mm}<br/>(Old Time: {oldSlot:MMM dd, HH:mm})</p>",
                    CancellationToken.None));
        }

        await _uow.SaveChangesAsync(cancellationToken);

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

// ── Lookup by reference handler ───────────────────────
public class LookupAppointmentByReferenceQueryHandler : IRequestHandler<LookupAppointmentByReferenceQuery, PublicAppointmentDto>
{
    private readonly IUnitOfWork _uow;

    public LookupAppointmentByReferenceQueryHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<PublicAppointmentDto> Handle(LookupAppointmentByReferenceQuery request, CancellationToken cancellationToken)
    {
        var hasRef = !string.IsNullOrWhiteSpace(request.BookingReference);
        var hasPhone = !string.IsNullOrWhiteSpace(request.Phone);

        if (!hasRef && !hasPhone)
            throw new DomainException("Please provide a booking reference or a phone number.");

        var appointments = await _uow.Appointments.GetAllAsync(
            a => (!hasRef || a.BookingReference == request.BookingReference) &&
                 (!hasPhone || a.PatientPhone == request.Phone || a.User.PhoneNumber == request.Phone),
            cancellationToken,
            a => a.Doctor);

        var appointment = appointments.OrderByDescending(a => a.CreatedAt).FirstOrDefault()
            ?? throw new NotFoundException("Appointment", request.BookingReference ?? request.Phone ?? "");

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

public class SearchPublicAppointmentsQueryHandler : IRequestHandler<SearchPublicAppointmentsQuery, IEnumerable<PublicAppointmentSearchDto>>
{
    private readonly IUnitOfWork _uow;

    public SearchPublicAppointmentsQueryHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<IEnumerable<PublicAppointmentSearchDto>> Handle(SearchPublicAppointmentsQuery request, CancellationToken cancellationToken)
    {
        var hasName = !string.IsNullOrWhiteSpace(request.Name);
        var hasPhone = !string.IsNullOrWhiteSpace(request.Phone);

        if (!hasName && !hasPhone)
            throw new DomainException("Please provide a patient name or phone number.");

        var normalizedName = request.Name?.Trim().ToLowerInvariant();
        var normalizedPhone = request.Phone?.Trim();

        var appointments = await _uow.Appointments.GetAllAsync(
            a =>
                (!hasPhone || a.PatientPhone == normalizedPhone || a.User!.PhoneNumber == normalizedPhone) &&
                (!hasName ||
                    (a.PatientName != null && a.PatientName.ToLower().Contains(normalizedName!)) ||
                    (a.User != null && a.User.Name.ToLower().Contains(normalizedName!))),
            cancellationToken,
            a => a.Doctor,
            a => a.User);

        return appointments
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .Select(a => new PublicAppointmentSearchDto(
                a.Id,
                a.BookingReference,
                a.Doctor.Name,
                a.SlotDateTime,
                a.Status,
                a.CreatedAt,
                a.PatientName ?? a.User?.Name ?? "Patient",
                a.PatientPhone ?? a.User?.PhoneNumber ?? "",
                a.IsPaid
            ));
    }
}

// ── Authenticated handlers (existing) ─────────────────
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
            // Validate transition
            bool valid = (patientAppointment.Status, request.NewStatus.Value) switch
            {
                (AppointmentStatus.Pending, AppointmentStatus.Confirmed) => true,
                (AppointmentStatus.Pending, AppointmentStatus.Cancelled) => true,
                (AppointmentStatus.Confirmed, AppointmentStatus.Cancelled) => true,
                (AppointmentStatus.Confirmed, AppointmentStatus.Completed) => true,
                (AppointmentStatus.Rescheduled, AppointmentStatus.Confirmed) => true,
                (AppointmentStatus.Rescheduled, AppointmentStatus.Cancelled) => true,
                _ => isAdmin
            };

            if (!valid)
                throw new InvalidStatusTransitionException(patientAppointment.Status.ToString(), request.NewStatus.ToString());

            patientAppointment.Status = request.NewStatus.Value;
            
            if (request.NewStatus == AppointmentStatus.Confirmed)
                patientAppointment.ConfirmedAt = DateTime.UtcNow;
            if (request.NewStatus == AppointmentStatus.Cancelled)
                patientAppointment.CancelledAt = DateTime.UtcNow;
        }

        if (request.IsPaid.HasValue)
        {
            patientAppointment.IsPaid = request.IsPaid.Value;
        }

        patientAppointment.UpdatedAt = DateTime.UtcNow;
        await _uow.Appointments.UpdateAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // Notify patient if completed
        if (request.NewStatus == AppointmentStatus.Completed)
        {
            var email = patientAppointment.User?.Email ?? patientAppointment.PatientEmail;
            if (!string.IsNullOrEmpty(email))
            {
                var doctor = await _uow.Doctors.GetByIdAsync(patientAppointment.DoctorId, cancellationToken);
                BackgroundJob.Enqueue<IEmailService>(emailSvc => 
                    emailSvc.SendAsync(email, "Your appointment is completed", 
                    $"<h2>Thank you!</h2><p>Your appointment with Dr. {doctor.Name ?? "Doctor"} on {patientAppointment.SlotDateTime:MMM dd, yyyy} is now marked as completed.</p>", CancellationToken.None));
            }
        }

        return Unit.Value;
    }
}

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

        var isAdmin = _currentUser.Role == "Admin" || _currentUser.Role == "2";
        var isOwner = patientAppointment.UserId == _currentUser.UserId;

        if (!isAdmin && !isOwner)
            throw new UnauthorizedActionException();

        patientAppointment.Status = AppointmentStatus.Cancelled;
        patientAppointment.CancelledAt = DateTime.UtcNow;
        patientAppointment.UpdatedAt = DateTime.UtcNow;

        await _uow.Appointments.UpdateAsync(patientAppointment, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

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
