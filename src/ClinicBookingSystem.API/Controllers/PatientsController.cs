using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Patients;
using ClinicBookingSystem.Application.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Receptionist,Doctor")]
[RequireActiveSubscription]
public class PatientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PatientsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientDto>>> GetAll()
    {
        return Ok(await _mediator.Send(new GetAllPatientsQuery()));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetPatientByIdQuery(id)));
    }

    /// <summary>Create a new patient (Staff/Admin only)</summary>
    [HttpPost]
    [CheckPlanLimit(SaaSFeatureCodes.PatientLimit)]
    public async Task<ActionResult<PatientDto>> Create(CreatePatientCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PatientDto>> Update(Guid id, UpdatePatientCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeletePatientCommand(id));
        return NoContent();
    }
}
