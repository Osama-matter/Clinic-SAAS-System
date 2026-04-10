using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Doctors;
using ClinicBookingSystem.Application.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class DoctorsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DoctorsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Get all doctors (public)</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DoctorDto>>> GetAll([FromQuery] string? specialty, [FromQuery] bool? isActive)
    {
        return Ok(await _mediator.Send(new GetDoctorsQuery(specialty, isActive)));
    }

    /// <summary>Get doctor by ID (public)</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DoctorDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetDoctorByIdQuery(id)));
    }

    /// <summary>Get available time slots for a doctor on a given date (public)</summary>
    [HttpGet("{id}/slots")]
    [ProducesResponseType(typeof(IEnumerable<TimeSlotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TimeSlotDto>>> GetAvailableSlots(Guid id, [FromQuery] DateOnly date)
    {
        var dateAsDateTime = date.ToDateTime(TimeOnly.MinValue);
        return Ok(await _mediator.Send(new GetAvailableSlotsQuery(id, dateAsDateTime)));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    [CheckPlanLimit(SaaSFeatureCodes.DoctorLimit)]
    public async Task<ActionResult<DoctorDto>> Create(CreateDoctorCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    public async Task<ActionResult<DoctorDto>> Update(Guid id, UpdateDoctorCommand command)
    {
        if (id != command.Id) return BadRequest();
        return Ok(await _mediator.Send(command));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{id}/photo")]
    public async Task<ActionResult<DoctorDto>> UploadPhoto(Guid id, IFormFile file, [FromServices] IWebHostEnvironment env)
    {
        var doctor = await _mediator.Send(new GetDoctorByIdQuery(id));
        if (doctor == null) return NotFound();

        if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

        var uploadsFolder = Path.Combine(env.WebRootPath, "uploads", "doctors");
        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{id}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var photoUrl = $"/uploads/doctors/{fileName}";
        
        // Update doctor record with new photo URL
        await _mediator.Send(new UpdateDoctorCommand(
            id, 
            doctor.Name, 
            doctor.Specialty, 
            doctor.Bio, 
            photoUrl, 
            doctor.IsActive,
            doctor.TenantId));

        return Ok(await _mediator.Send(new GetDoctorByIdQuery(id)));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteDoctorCommand(id));
        return NoContent();
    }
}

