using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Application.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Schedules;

public class ScheduleHandlers : 
    IRequestHandler<CreateScheduleCommand, ScheduleDto>,
    IRequestHandler<UpdateScheduleCommand, ScheduleDto>,
    IRequestHandler<DeleteScheduleCommand, Unit>,
    IRequestHandler<GetDoctorSchedulesQuery, IEnumerable<ScheduleDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public ScheduleHandlers(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<ScheduleDto> Handle(CreateScheduleCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _currentUser.TenantId
            ?? throw new DomainException("Tenant ID is required.");

        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        if (!isSuperAdmin && doctor.TenantId != tenantId)
            throw new UnauthorizedActionException("Cannot create schedule for a doctor belonging to another clinic.");

        var schedule = new Schedule
        {
            TenantId = tenantId,
            DoctorId = request.DoctorId,
            DayOfWeek = (System.DayOfWeek)request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            SlotDurationMinutes = request.SlotDurationMinutes
        };

        await _uow.Schedules.AddAsync(schedule, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(schedule);
    }

    public async Task<ScheduleDto> Handle(UpdateScheduleCommand request, CancellationToken cancellationToken)
    {
        var schedule = await _uow.Schedules.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Schedule), request.Id);

        schedule.DayOfWeek = (System.DayOfWeek)request.DayOfWeek;
        schedule.StartTime = request.StartTime;
        schedule.EndTime = request.EndTime;
        schedule.SlotDurationMinutes = request.SlotDurationMinutes;

        await _uow.Schedules.UpdateAsync(schedule, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(schedule);
    }

    public async Task<Unit> Handle(DeleteScheduleCommand request, CancellationToken cancellationToken)
    {
        var schedule = await _uow.Schedules.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Schedule), request.Id);

        await _uow.Schedules.DeleteAsync(schedule, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<IEnumerable<ScheduleDto>> Handle(GetDoctorSchedulesQuery request, CancellationToken cancellationToken)
    {
        var schedules = await _uow.Schedules.GetAllAsync(
            s => s.DoctorId == request.DoctorId,
            cancellationToken);

        return schedules.Select(MapToDto);
    }

    private static ScheduleDto MapToDto(Schedule s) => new(
        s.Id,
        s.DoctorId,
        (ClinicBookingSystem.Domain.Enums.DayOfWeek)s.DayOfWeek,
        s.StartTime,
        s.EndTime,
        s.SlotDurationMinutes
    );
}
