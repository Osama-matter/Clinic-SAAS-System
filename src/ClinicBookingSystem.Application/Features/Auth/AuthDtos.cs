using MediatR;

namespace ClinicBookingSystem.Application.Features.Auth;

// ── DTOs ──────────────────────────────────────────────
public record AuthTokenDto(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserDto User);

public record UserDto(Guid Id, string Name, string Email, string Role, DateTime CreatedAt);

// ── Commands ──────────────────────────────────────────
public record RegisterCommand(string Name, string Email, string Password, Guid? TenantId = null) : IRequest<UserDto>;

public record CreateAdminCommand(string Name, string Email, string Password) : IRequest<UserDto>;

public record LoginCommand(string Email, string Password) : IRequest<AuthTokenDto>;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthTokenDto>;

public record GetPatientsQuery() : IRequest<IEnumerable<UserDto>>;
