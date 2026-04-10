using ClinicBookingSystem.Application.Features.Visits;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Receptionist,Doctor")]
public class VisitsController : ControllerBase
{
    private readonly IMediator _mediator;

    public VisitsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VisitDetailDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetVisitByIdQuery(id)));
    }

    [HttpGet("patient/{patientId}")]
    public async Task<ActionResult<IEnumerable<VisitSummaryDto>>> GetByPatient(Guid patientId)
    {
        return Ok(await _mediator.Send(new GetVisitsByPatientQuery(patientId)));
    }

    [HttpPost]
    public async Task<ActionResult<VisitSummaryDto>> Create(CreateVisitCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("comprehensive")]
    public async Task<ActionResult<VisitDetailDto>> CreateComprehensive([FromBody] CreateComprehensiveVisitCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<VisitDetailDto>> UpdateComprehensive(Guid id, [FromBody] UpdateComprehensiveVisitCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteVisitCommand(id));
        return NoContent();
    }

    [HttpPost("{id}/vitals")]
    public async Task<ActionResult> AddVitals(Guid id, AddVitalsCommand command)
    {
        if (id != command.VisitId) return BadRequest("ID mismatch");
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/prescriptions")]
    public async Task<ActionResult> AddPrescription(Guid id, AddPrescriptionCommand command)
    {
        if (id != command.VisitId) return BadRequest("ID mismatch");
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/diagnoses")]
    public async Task<ActionResult> AddDiagnosis(Guid id, AddDiagnosisCommand command)
    {
        if (id != command.VisitId) return BadRequest("ID mismatch");
        await _mediator.Send(command);
        return NoContent();
    }
    [HttpPost("upload-image")]
    public async Task<ActionResult<object>> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");
        var url = await _mediator.Send(new UploadVisitImageCommand(file.OpenReadStream(), file.FileName));
        return Ok(new { url });
    }
}
