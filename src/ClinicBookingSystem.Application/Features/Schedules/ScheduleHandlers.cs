using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Schedules;

public class ScheduleHandlers : 
    IRequestHandler<CreateScheduleCommand, ScheduleDto>,
    IRequestHandler<UpdateScheduleCommand, ScheduleDto>,
    IRequestHandler<DeleteScheduleCommand, Unit>,
    IRequestHandler<GetDoctorSchedulesQuery, IEnumerable<ScheduleDto>>
{
    private readonly IUnitOfWork _uow;

    public ScheduleHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ScheduleDto> Handle(CreateScheduleCommand request, CancellationToken cancellationToken)
    {
        var schedule = new Schedule
        {
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
