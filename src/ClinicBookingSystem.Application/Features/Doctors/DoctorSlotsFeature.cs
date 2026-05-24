using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

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

        // Get schedule for the requested day of week - use integer comparison for robustness
        var dayOfWeekInt = (int)request.Date.DayOfWeek;
        var schedules = await _uow.Schedules
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted
                && s.DoctorId == request.DoctorId
                && (int)s.DayOfWeek == dayOfWeekInt)
            .ToListAsync(cancellationToken);

        if (!schedules.Any())
            return Enumerable.Empty<TimeSlotDto>();

        // Get blocked slots for the date
        var dateStart = request.Date.Date;
        var dateEnd = dateStart.AddDays(1); 
        var blockedList = await _uow.BlockedSlots
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(b => !b.IsDeleted
                && b.DoctorId == request.DoctorId
                && b.StartTime < dateEnd
                && b.EndTime > dateStart)
            .ToListAsync(cancellationToken);

        // Get existing appointments for the date
        var bookedSlotsList = await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(a => !a.IsDeleted
                && a.DoctorId == request.DoctorId
                && a.SlotDateTime >= dateStart
                && a.SlotDateTime < dateEnd
                && a.Status != Domain.Enums.AppointmentStatus.Cancelled)
            .Select(a => a.SlotDateTime)
            .ToListAsync(cancellationToken);

        var bookedSlots = bookedSlotsList.ToHashSet();

        // Generate time slots
        var slots = new List<TimeSlotDto>();

        foreach (var schedule in schedules)
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
