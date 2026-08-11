using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Infrastructure.Services;

public class SchedulingService : ISchedulingService
{
    private readonly IUnitOfWork _uow;

    public SchedulingService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task ValidateSlotAvailabilityAsync(Doctor doctor, DateTime slotDateTime, Guid? currentUserId = null, CancellationToken cancellationToken = default)
    {
        if (!doctor.IsActive)
            throw new DomainException("Doctor is not active.");

        if (slotDateTime < DateTime.UtcNow)
            throw new DomainException("Cannot book an appointment in the past.");

        // 1. Check working hours schedule for day of week
        var dayOfWeekInt = (int)slotDateTime.DayOfWeek;
        var schedules = await _uow.Schedules
            .AsQueryable()
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted && s.DoctorId == doctor.Id && (int)s.DayOfWeek == dayOfWeekInt)
            .ToListAsync(cancellationToken);

        if (!schedules.Any())
            throw new DomainException("Doctor is not available on this day.");

        var timeOfDay = slotDateTime.TimeOfDay;
        var isInWorkingHours = schedules.Any(s => timeOfDay >= s.StartTime && timeOfDay < s.EndTime);
        if (!isInWorkingHours)
            throw new DomainException("The requested slot is outside the doctor's working hours.");

        // 2. Check blocked slots
        var isBlocked = await _uow.BlockedSlots
            .AsQueryable()
            .IgnoreQueryFilters()
            .AnyAsync(
                b => !b.IsDeleted && b.DoctorId == doctor.Id && slotDateTime >= b.StartTime && slotDateTime < b.EndTime,
                cancellationToken);

        if (isBlocked)
            throw new SchedulingConflictException("This time slot is blocked.");

        // 3. Check for existing doctor appointments
        var isDoctorBooked = await _uow.Appointments
            .AsQueryable()
            .IgnoreQueryFilters()
            .AnyAsync(
                a => !a.IsDeleted && a.DoctorId == doctor.Id && a.SlotDateTime == slotDateTime && a.Status != AppointmentStatus.Cancelled,
                cancellationToken);

        if (isDoctorBooked)
            throw new SchedulingConflictException("This doctor is already booked for this slot.");

        // 4. Check for existing patient appointments if user is logged in
        if (currentUserId.HasValue)
        {
            var isPatientBooked = await _uow.Appointments
                .AsQueryable()
                .IgnoreQueryFilters()
                .AnyAsync(
                    a => !a.IsDeleted && a.UserId == currentUserId.Value && a.SlotDateTime == slotDateTime && a.Status != AppointmentStatus.Cancelled,
                    cancellationToken);

            if (isPatientBooked)
                throw new SchedulingConflictException("You already have another appointment at this time.");
        }
    }
}
