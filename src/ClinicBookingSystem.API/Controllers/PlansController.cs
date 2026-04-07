using ClinicBookingSystem.Application.Features.Plans;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlansController : ControllerBase
{
    private readonly IMediator _mediator;

    public PlansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlanDto>>> GetAll([FromQuery] bool? isActive)
    {
        return Ok(await _mediator.Send(new GetPlansQuery(isActive)));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlanDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetPlanByIdQuery(id)));
    }

    [HttpPost]
    public async Task<ActionResult<PlanDto>> Create(CreatePlanCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PlanDto>> Update(Guid id, UpdatePlanCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeletePlanCommand(id));
        return NoContent();
    }
}
