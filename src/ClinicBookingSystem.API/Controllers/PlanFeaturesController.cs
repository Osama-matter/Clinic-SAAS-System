using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.PlanFeatures;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpPost]
    public async Task<ActionResult<PlanFeatureDto>> Upsert(UpsertPlanFeatureCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpDelete("plan/{planId}/feature/{featureId}")]
    public async Task<ActionResult> Delete(Guid planId, Guid featureId)
    {
        await _mediator.Send(new DeletePlanFeatureCommand(planId, featureId));
        return NoContent();
    }
}
