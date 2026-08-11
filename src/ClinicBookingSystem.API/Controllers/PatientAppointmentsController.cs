using ClinicBookingSystem.Application.Features.Appointments;
using ClinicBookingSystem.Application.Features.Doctors;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.API.Filters;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicBookingSystem.API.Controllers;

/// <summary>Patient appointment booking endpoints</summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class AppointmentsController : BaseController
{
    private readonly ITenantProvider _tenantProvider;

    public AppointmentsController(IMediator mediator, ITenantProvider tenantProvider) : base(mediator)
    {
        _tenantProvider = tenantProvider;
    }

    // ── Authenticated endpoints ───────────────────────────

    /// <summary>Book an Appointment (authenticated user)</summary>
    [HttpPost("book")]
    [CheckPlanLimit(SaaSFeatureCodes.AppointmentsLimit)]
    [ProducesResponseType(typeof(AppointmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Book([FromBody] BookAppointmentCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>Get my Appointments</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(IEnumerable<AppointmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMine([FromQuery] AppointmentStatus? status, CancellationToken ct)
        => Ok(await Mediator.Send(new GetMyAppointmentsQuery(status), ct));

    /// <summary>Update Appointment status</summary>
    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusCommand command, CancellationToken ct)
    {
        await Mediator.Send(command with { AppointmentId = id }, ct);
        return NoContent();
    }

    /// <summary>Cancel an Appointment</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new CancelAppointmentCommand(id), ct);
        return NoContent();
    }

    // ── Public endpoints (no login required) ──────────────

    /// <summary>Book an appointment without login (guest)</summary>
    [AllowAnonymous]
    [EnableRateLimiting("PublicBookingPolicy")]
    [HttpPost("public")]
    [CheckPlanLimit(SaaSFeatureCodes.AppointmentsLimit)]
    [ProducesResponseType(typeof(PublicAppointmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PublicBook([FromBody] PublicBookAppointmentCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>Lookup appointment by booking reference and phone</summary>
    [AllowAnonymous]
    [EnableRateLimiting("PublicBookingPolicy")]
    [HttpPost("public/lookup")]
    [ProducesResponseType(typeof(PublicAppointmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublicLookup([FromBody] LookupAppointmentByReferenceQuery query, CancellationToken ct)
    {
        var effectiveTenantId = query.TenantId ?? _tenantProvider.TenantId;
        return Ok(await Mediator.Send(query with { TenantId = effectiveTenantId }, ct));
    }

    /// <summary>Search public appointments by patient name or phone</summary>
    [AllowAnonymous]
    [EnableRateLimiting("PublicBookingPolicy")]
    [HttpGet("public/search")]
    [ProducesResponseType(typeof(IEnumerable<PublicAppointmentSearchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PublicSearch([FromQuery] string? name, [FromQuery] string? phone, [FromQuery] Guid? tenantId, CancellationToken ct)
    {
        var effectiveTenantId = tenantId ?? _tenantProvider.TenantId;
        return Ok(await Mediator.Send(new SearchPublicAppointmentsQuery(name, phone, effectiveTenantId), ct));
    }

    /// <summary>Reschedule appointment by booking reference and phone</summary>
    [AllowAnonymous]
    [EnableRateLimiting("PublicBookingPolicy")]
    [HttpPut("public/reschedule")]
    [ProducesResponseType(typeof(PublicAppointmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> PublicReschedule([FromBody] PublicRescheduleAppointmentCommand command, CancellationToken ct)
    {
        var effectiveTenantId = command.TenantId ?? _tenantProvider.TenantId;
        return Ok(await Mediator.Send(command with { TenantId = effectiveTenantId }, ct));
    }

    /// <summary>Cancel appointment by booking reference and phone</summary>
    [AllowAnonymous]
    [EnableRateLimiting("PublicBookingPolicy")]
    [HttpPost("public/cancel")]
    [HttpDelete("public/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublicCancel([FromBody] PublicCancelAppointmentCommand command, CancellationToken ct)
    {
        var effectiveTenantId = command.TenantId ?? _tenantProvider.TenantId;
        await Mediator.Send(command with { TenantId = effectiveTenantId }, ct);
        return NoContent();
    }

    // ── Doctor endpoints ──────────────────────────────────

    /// <summary>Doctor views their own appointment schedule</summary>
    [Authorize(Roles = "Admin,Receptionist,Doctor")]
    [HttpGet("my-schedule")]
    [ProducesResponseType(typeof(IEnumerable<AppointmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyDoctorSchedule([FromQuery] Guid? doctorId, [FromQuery] DateTime? date, [FromQuery] AppointmentStatus? status, CancellationToken ct)
        => Ok(await Mediator.Send(new GetMyDoctorScheduleQuery(doctorId, date, status), ct));

    /// <summary>Doctor adds notes to an appointment</summary>
    [Authorize(Policy = "DoctorOnly")]
    [HttpPatch("{id:guid}/notes")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AddNotes(Guid id, [FromBody] NotesRequest request, CancellationToken ct)
    {
        await Mediator.Send(new AddAppointmentNotesCommand(id, request.Notes), ct);
        return NoContent();
    }
}
