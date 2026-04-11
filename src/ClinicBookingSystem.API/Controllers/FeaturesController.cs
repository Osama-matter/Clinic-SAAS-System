using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Features;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class FeaturesController : ControllerBase
{
    private readonly IMediator _mediator;

    public FeaturesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeatureDto>>> GetAll()
    {
        return Ok(await _mediator.Send(new GetFeaturesQuery()));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FeatureDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetFeatureByIdQuery(id)));
    }

    [HttpPost]
    public async Task<ActionResult<FeatureDto>> Create(CreateFeatureCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FeatureDto>> Update(Guid id, UpdateFeatureCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteFeatureCommand(id));
        return NoContent();
    }
}
