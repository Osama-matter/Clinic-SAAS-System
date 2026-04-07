using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Application.Features.Auth;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, UserDto>
{
    private readonly IUnitOfWork _uow;

    public RegisterCommandHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<UserDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        // 1. Check for duplicate email
        var users = await _uow.Users.GetAllAsync(
            u => u.Email == request.Email.ToLowerInvariant(),
            cancellationToken);
        if (users.Any())
            throw new DomainException("A user with this email already exists.");

        // 2. Create patient user — always Patient role, never auto Admin
        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BC.HashPassword(request.Password, workFactor: 12),
            Role = UserRole.User,  // Always patient
            TenantId = request.TenantId  // optional, set if clinic is passed
        };

        await _uow.Users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt);
    }
}

public class CreateAdminCommandHandler : IRequestHandler<CreateAdminCommand, UserDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public CreateAdminCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<UserDto> Handle(CreateAdminCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != "Admin")
            throw new UnauthorizedActionException("Only administrators can create other administrator accounts.");

        var currentUserId = _currentUser.UserId ?? throw new UnauthorizedActionException("User not found.");
        var currentUser = await _uow.Users.GetByIdAsync(currentUserId, cancellationToken)
            ?? throw new UnauthorizedActionException("User account not found.");

        var users = await _uow.Users.GetAllAsync(
            u => u.Email == request.Email.ToLowerInvariant(),
            cancellationToken);
        if (users.Any())
            throw new DomainException("A user with this email already exists.");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BC.HashPassword(request.Password, workFactor: 12),
            Role = UserRole.Admin,
            TenantId = currentUser.TenantId
        };

        await _uow.Users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt);
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthTokenDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;

    public LoginCommandHandler(IUnitOfWork uow, ITokenService tokenService)
    {
        _uow = uow;
        _tokenService = tokenService;
    }

    public async Task<AuthTokenDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var users = await _uow.Users.GetAllAsync(
            u => u.Email == request.Email.ToLowerInvariant(),
            cancellationToken);
        var user = users.FirstOrDefault()
            ?? throw new UnauthorizedActionException("Invalid email or password.");

        if (!BC.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedActionException("Invalid email or password.");

        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Role, user.TenantId ?? Guid.Empty);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = BC.HashPassword(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt);
        return new AuthTokenDto(accessToken, refreshToken, DateTime.UtcNow.AddMinutes(15), userDto);
    }
}

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthTokenDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;

    public RefreshTokenCommandHandler(IUnitOfWork uow, ITokenService tokenService)
    {
        _uow = uow;
        _tokenService = tokenService;
    }

    public async Task<AuthTokenDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var users = await _uow.Users.GetAllAsync(
            u => u.RefreshToken != null,
            cancellationToken);
        var user = users.FirstOrDefault(u => BC.Verify(request.RefreshToken, u.RefreshToken))
            ?? throw new UnauthorizedActionException("Invalid refresh token.");

        if (user.RefreshTokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedActionException("Refresh token expired.");

        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Role, user.TenantId ?? Guid.Empty);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = BC.HashPassword(newRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt);
        return new AuthTokenDto(accessToken, newRefreshToken, DateTime.UtcNow.AddMinutes(15), userDto);
    }
}

public class GetPatientsQueryHandler : IRequestHandler<GetPatientsQuery, IEnumerable<UserDto>>
{
    private readonly IUnitOfWork _uow;

    public GetPatientsQueryHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<IEnumerable<UserDto>> Handle(GetPatientsQuery request, CancellationToken cancellationToken)
    {
        var patients = await _uow.Users.GetAllAsync(
            u => u.Role == UserRole.User,
            cancellationToken);

        return patients.Select(u => new UserDto(
            u.Id,
            u.Name,
            u.Email,
            ((int)u.Role).ToString(),
            u.CreatedAt));
    }
}
