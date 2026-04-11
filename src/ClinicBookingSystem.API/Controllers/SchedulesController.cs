using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Schedules;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class SchedulesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SchedulesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("doctor/{doctorId}")]
    public async Task<ActionResult<IEnumerable<ScheduleDto>>> GetByDoctor(Guid doctorId)
    {
        return Ok(await _mediator.Send(new GetDoctorSchedulesQuery(doctorId)));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<ActionResult<ScheduleDto>> Create(CreateScheduleCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    public async Task<ActionResult<ScheduleDto>> Update(Guid id, UpdateScheduleCommand command)
    {
        if (id != command.Id) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteScheduleCommand(id));
        return NoContent();
    }
}
