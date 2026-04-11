using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.PlanFeatures;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class PlanFeaturesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PlanFeaturesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("plan/{planId}")]
    public async Task<ActionResult<IEnumerable<PlanFeatureDto>>> GetByPlanId(Guid planId)
    {
        return Ok(await _mediator.Send(new GetPlanFeaturesQuery(planId)));
    }

    [HttpPost]
    public async Task<ActionResult<PlanFeatureDto>> Upsert(UpsertPlanFeatureCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("plan/{planId}/feature/{featureId}")]
    public async Task<ActionResult> Delete(Guid planId, Guid featureId)
    {
        await _mediator.Send(new DeletePlanFeatureCommand(planId, featureId));
        return NoContent();
    }
}
