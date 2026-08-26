using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Constants;
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
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DoctorDto>>> GetAll([FromQuery] string? specialty, [FromQuery] bool? isActive)
    {
        return Ok(await _mediator.Send(new GetDoctorsQuery(specialty, isActive)));
    }

    /// <summary>Get doctor by ID (public)</summary>
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<DoctorDto>> GetById(Guid id)
    {
        return Ok(await _mediator.Send(new GetDoctorByIdQuery(id)));
    }

    /// <summary>Get available time slots for a doctor on a given date (public)</summary>
    [AllowAnonymous]
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
    [HttpPost("{id:guid}/photo")]
    public async Task<ActionResult<DoctorDto>> UploadPhoto(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest("Invalid file type. Only JPG, PNG, and WebP images are allowed.");

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest("File size exceeds 5MB limit.");

        using var stream = file.OpenReadStream();
        var result = await _mediator.Send(new UploadDoctorPhotoCommand(id, stream, file.FileName));
        return Ok(result);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteDoctorCommand(id));
        return NoContent();
    }
}

