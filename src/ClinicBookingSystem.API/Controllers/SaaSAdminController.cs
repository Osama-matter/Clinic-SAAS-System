using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.SaaSAdmin;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AppPolicies.SuperAdminOnly)]
public class SaaSAdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public SaaSAdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<SaasDashboardStatsDto>> GetStats()
    {
        return Ok(await _mediator.Send(new GetSaasDashboardStatsQuery()));
    }

    [HttpGet("analytics/revenue")]
    public async Task<ActionResult<IEnumerable<RevenuePointDto>>> GetRevenueAnalytics()
    {
        return Ok(await _mediator.Send(new GetSaasRevenueAnalyticsQuery()));
    }

    [HttpGet("usage")]
    public async Task<ActionResult<IEnumerable<ClinicUsageDto>>> GetUsageMetrics()
    {
        return Ok(await _mediator.Send(new GetClinicsUsageMetricsQuery()));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<SaasTransactionDto>>> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        return Ok(await _mediator.Send(new GetSaasTransactionsQuery(page, pageSize)));
    }

    [HttpPut("subscription")]
    public async Task<ActionResult<bool>> UpdateSubscription([FromBody] UpdateClinicSubscriptionCommand command)
    {
        return Ok(await _mediator.Send(command));
    }

    [HttpPost("manual-clinic")]
    public async Task<ActionResult<Guid>> ManualCreateClinic([FromBody] ManualCreateClinicCommand command)
    {
        var tenantId = await _mediator.Send(command);
        return Ok(tenantId);
    }
}
