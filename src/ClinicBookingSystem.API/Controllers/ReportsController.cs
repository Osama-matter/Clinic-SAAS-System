using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Reports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

/// <summary>Reports and analytics endpoints</summary>
[Authorize(Roles = "Admin,Receptionist,Doctor")]
[ApiController]
[Route("api/[controller]")]
[RequireActiveSubscription]
public class ReportsController : BaseController
{
    public ReportsController(IMediator mediator) : base(mediator) { }

    /// <summary>Get attendance report summary (Admin only)</summary>
    [HttpGet("attendance")]
    [ProducesResponseType(typeof(AttendanceReportSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAttendance([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await Mediator.Send(new GetAttendanceSummaryQuery(from, to), ct));

    /// <summary>Export appointments report as CSV or PDF (Admin only)</summary>
    [HttpGet("export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Export([FromQuery] string format = "csv", [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, CancellationToken ct = default)
    {
        var (data, contentType, fileName) = await Mediator.Send(new ExportReportQuery(format, from, to), ct);
        return File(data, contentType, fileName);
    }
}

