using ClinicBookingSystem.Application.Features.ClinicSubscriptions;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClinicSubscriptionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ClinicSubscriptionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("clinic/{clinicId}")]
    public async Task<ActionResult<IEnumerable<ClinicSubscriptionDto>>> GetByClinicId(Guid clinicId)
    {
        return Ok(await _mediator.Send(new GetClinicSubscriptionsQuery(clinicId)));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ClinicSubscriptionDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetClinicSubscriptionByIdQuery(id)));
    }

    [HttpPost]
    public async Task<ActionResult<ClinicSubscriptionDto>> Create(CreateClinicSubscriptionCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ClinicSubscriptionDto>> UpdateStatus(Guid id, UpdateClinicSubscriptionStatusCommand command)
    {
        if (id != command.SubscriptionId) return BadRequest("ID mismatch");
        return Ok(await _mediator.Send(command));
    }
}
