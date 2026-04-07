using ClinicBookingSystem.Application.Features.Tenants;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TenantsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Get all active clinics (public)</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TenantDto>>> GetAll()
    {
        return Ok(await _mediator.Send(new GetTenantsQuery()));
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
}
