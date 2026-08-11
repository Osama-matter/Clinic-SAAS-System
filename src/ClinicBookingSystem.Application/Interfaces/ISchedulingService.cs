using ClinicBookingSystem.Domain.Entities;

namespace ClinicBookingSystem.Application.Interfaces;

public interface ISchedulingService
{
    Task ValidateSlotAvailabilityAsync(Doctor doctor, DateTime slotDateTime, Guid? currentUserId = null, CancellationToken cancellationToken = default);
}
