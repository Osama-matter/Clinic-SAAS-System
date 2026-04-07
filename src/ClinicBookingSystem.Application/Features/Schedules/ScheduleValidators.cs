using FluentValidation;

namespace ClinicBookingSystem.Application.Features.Schedules;

public class CreateScheduleCommandValidator : AbstractValidator<CreateScheduleCommand>
{
    public CreateScheduleCommandValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty();
        RuleFor(x => x.DayOfWeek).IsInEnum();
        RuleFor(x => x.StartTime).NotEmpty();
        RuleFor(x => x.EndTime).NotEmpty()
            .GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");
        RuleFor(x => x.SlotDurationMinutes).GreaterThan(0);
    }
}

public class UpdateScheduleCommandValidator : AbstractValidator<UpdateScheduleCommand>
{
    public UpdateScheduleCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.DayOfWeek).IsInEnum();
        RuleFor(x => x.StartTime).NotEmpty();
        RuleFor(x => x.EndTime).NotEmpty()
            .GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");
        RuleFor(x => x.SlotDurationMinutes).GreaterThan(0);
    }
}
