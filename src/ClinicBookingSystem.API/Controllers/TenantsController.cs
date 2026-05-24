using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Tenants;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class TenantsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TenantsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Get all active clinics (public)</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TenantDto>>> GetAll()
    {
        return Ok(await _mediator.Send(new GetTenantsQuery()));
    }

    /// <summary>Get all clinics summary (optimized for performance)</summary>
    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<ActionResult<IEnumerable<TenantSummaryDto>>> GetSummary()
    {
        return Ok(await _mediator.Send(new GetTenantsSummaryQuery()));
    }

    /// <summary>Create a new clinic (Admin only)</summary>
    [HttpPost]
    public async Task<ActionResult<TenantDto>> Create(CreateTenantCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    /// <summary>Update a clinic (Admin only)</summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<TenantDto>> Update(Guid id, UpdateTenantCommand command)
    {
        if (id != command.Id) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    /// <summary>Delete a clinic (Admin only)</summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteTenantCommand(id));
        return NoContent();
    }

    /// <summary>Get a clinic public profile by subdomain</summary>
    [AllowAnonymous]
    [HttpGet("public/{subdomain}")]
    public async Task<ActionResult<ClinicPublicProfileDto>> GetPublicProfile(string subdomain)
    {
        return Ok(await _mediator.Send(new GetClinicPublicProfileQuery(subdomain)));
    }

    /// <summary>Get only clinic images (lazy load)</summary>
    [AllowAnonymous]
    [HttpGet("public/{subdomain}/images")]
    public async Task<ActionResult<object>> GetPublicProfileImages(string subdomain)
    {
        return Ok(await _mediator.Send(new GetClinicPublicImagesQuery(subdomain)));
    }

    /// <summary>Update the current clinic public page</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("my-page")]
    public async Task<ActionResult<TenantDto>> UpdateMyPage([FromBody] UpdateClinicPublicPageCommand command)
    {
        return Ok(await _mediator.Send(command));
    }
}
