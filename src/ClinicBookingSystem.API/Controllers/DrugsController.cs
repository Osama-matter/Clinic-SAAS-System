using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Application.Features.Drugs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireActiveSubscription]
public class DrugsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DrugsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<DrugDto>>> Search(
        [FromQuery] string query = "", 
        [FromQuery] int take = 15, 
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new SearchDrugsQuery(query, take), cancellationToken);
        return Ok(result);
    }
}
