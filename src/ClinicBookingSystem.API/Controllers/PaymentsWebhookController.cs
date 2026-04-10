using ClinicBookingSystem.Application.Features.Payments;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsWebhookController : ControllerBase
{
    private readonly IMediator _mediator;

    public PaymentsWebhookController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("fawaterak")]
    public async Task<IActionResult> FawaterakWebhook([FromBody] WebHookModel webHook)
    {
        var result = await _mediator.Send(new ProcessFawaterakWebhookCommand(webHook));
        
        if (result)
        {
            return Ok();
        }

        return BadRequest("Invalid webhook data or signature");
    }

    [HttpPost("fawaterak/cancel")]
    public async Task<IActionResult> FawaterakCancel([FromBody] CancelTransactionModel cancelModel)
    {
        // Logic for cancellation if needed
        return Ok();
    }
}
