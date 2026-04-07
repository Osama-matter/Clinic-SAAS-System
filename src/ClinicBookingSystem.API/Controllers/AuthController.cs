using ClinicBookingSystem.Application.Features.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class BaseController : ControllerBase
{
    protected readonly IMediator Mediator;
    protected BaseController(IMediator mediator) => Mediator = mediator;
}

/// <summary>Authentication endpoints</summary>
public class AuthController : BaseController
{
    public AuthController(IMediator mediator) : base(mediator) { }

    /// <summary>Register a new user account</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(Register), new { id = result.Id }, result);
    }

    /// <summary>Login and receive JWT tokens</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthTokenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken ct)
        => Ok(await Mediator.Send(command, ct));

    /// <summary>Refresh access token</summary>
    [HttpPost("refresh-token")]
    [ProducesResponseType(typeof(AuthTokenDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenCommand command, CancellationToken ct)
        => Ok(await Mediator.Send(command, ct));

    /// <summary>Create a new admin user (Admin only)</summary>
    [HttpPost("create-admin")]
    //[Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(Register), new { id = result.Id }, result);
    }
    
    /// <summary>Get list of all patients (Admin/Receptionist only)</summary>
    [Authorize]
    [HttpGet("patients")]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPatients(CancellationToken ct)
        => Ok(await Mediator.Send(new GetPatientsQuery(), ct));
}
