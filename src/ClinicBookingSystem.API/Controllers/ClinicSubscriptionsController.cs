using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.ClinicSubscriptions;
using ClinicBookingSystem.Application.Features.Payments;
using MediatR;
using Microsoft.AspNetCore.Authorization;
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

    [Authorize(Policy = AppPolicies.AdminOnly)]
    [HttpGet("my")]
    public async Task<ActionResult<MySubscriptionDto>> GetMySubscription()
    {
        return Ok(await _mediator.Send(new GetMySubscriptionQuery()));
    }

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpGet("clinic/{clinicId:guid}")]
    public async Task<ActionResult<IEnumerable<ClinicSubscriptionDto>>> GetByClinicId(Guid clinicId)
    {
        return Ok(await _mediator.Send(new GetClinicSubscriptionsQuery(clinicId)));
    }

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClinicSubscriptionDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetClinicSubscriptionByIdQuery(id)));
    }

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpPost]
    public async Task<ActionResult<ClinicSubscriptionDto>> Create(CreateClinicSubscriptionCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ClinicSubscriptionDto>> UpdateStatus(Guid id, UpdateClinicSubscriptionStatusCommand command)
    {
        if (id != command.SubscriptionId) return BadRequest("ID mismatch");
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = AppPolicies.AdminOnly)]
    [HttpPost("initiate-payment")]
    public async Task<ActionResult<string>> InitiatePayment(InitiateSubscriptionPaymentCommand command)
    {
        var paymentUrl = await _mediator.Send(command);
        return Ok(new { url = paymentUrl });
    }
}
