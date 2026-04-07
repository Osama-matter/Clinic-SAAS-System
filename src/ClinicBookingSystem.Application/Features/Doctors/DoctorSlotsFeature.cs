using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Doctors;

// ── DTOs ──────────────────────────────────────────────
public record TimeSlotDto(DateTime Start, DateTime End, bool IsAvailable);

// ── Queries ───────────────────────────────────────────
public record GetAvailableSlotsQuery(Guid DoctorId, DateTime Date) : IRequest<IEnumerable<TimeSlotDto>>;

// ── Handlers ──────────────────────────────────────────
public class GetAvailableSlotsQueryHandler : IRequestHandler<GetAvailableSlotsQuery, IEnumerable<TimeSlotDto>>
{
    private readonly IUnitOfWork _uow;

    public GetAvailableSlotsQueryHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<IEnumerable<TimeSlotDto>> Handle(GetAvailableSlotsQuery request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        if (!doctor.IsActive)
            return Enumerable.Empty<TimeSlotDto>();

        // Get schedule for the requested day of week
        var dayOfWeek = (ClinicBookingSystem.Domain.Enums.DayOfWeek)request.Date.DayOfWeek;
        var schedules = await _uow.Schedules.GetAllAsync(
            s => s.DoctorId == request.DoctorId && s.DayOfWeek == (System.DayOfWeek)dayOfWeek,
            cancellationToken);

        var scheduleList = schedules.ToList();
        if (!scheduleList.Any())
            return Enumerable.Empty<TimeSlotDto>();

        // Get blocked slots for the date
        var dateStart = request.Date.Date;
        var dateEnd = dateStart.AddDays(1);
        var blockedSlots = await _uow.BlockedSlots.GetAllAsync(
            b => b.DoctorId == request.DoctorId && b.StartTime < dateEnd && b.EndTime > dateStart,
            cancellationToken);
        var blockedList = blockedSlots.ToList();

        // Get existing appointments for the date
        var existingAppointments = await _uow.Appointments.GetAllAsync(
            a => a.DoctorId == request.DoctorId
                && a.SlotDateTime >= dateStart && a.SlotDateTime < dateEnd
                && a.Status != Domain.Enums.AppointmentStatus.Cancelled,
            cancellationToken);
        var bookedSlots = existingAppointments.Select(a => a.SlotDateTime).ToHashSet();

        // Generate time slots
        var slots = new List<TimeSlotDto>();

        foreach (var schedule in scheduleList)
        {
            var currentTime = dateStart.Add(schedule.StartTime);
            var endTime = dateStart.Add(schedule.EndTime);

            while (currentTime.AddMinutes(schedule.SlotDurationMinutes) <= endTime)
            {
                var slotEnd = currentTime.AddMinutes(schedule.SlotDurationMinutes);

                // Check if blocked
                var isBlocked = blockedList.Any(b => currentTime >= b.StartTime && currentTime < b.EndTime);

                // Check if already booked
                var isBooked = bookedSlots.Contains(currentTime);

                // Slot is only available if it's NOT blocked, NOT booked, AND is in the future
                var isPast = currentTime < DateTime.UtcNow;
                
                slots.Add(new TimeSlotDto(currentTime, slotEnd, !isBlocked && !isBooked && !isPast));

                currentTime = slotEnd;
            }
        }

        return slots.OrderBy(s => s.Start);
    }
}
