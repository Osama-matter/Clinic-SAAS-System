using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Application.Features.Auth;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, UserDto>
{
    private readonly IUnitOfWork _uow;

    public RegisterCommandHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<UserDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 1. Check for duplicate email
        if (await _uow.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
            throw new DomainException("A user with this email already exists.");

        // 2. Create patient user — always Patient role, never auto Admin
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BC.HashPassword(request.Password, workFactor: 12),
            Role = UserRole.User,  // Always patient
            TenantId = request.TenantId,  // optional, set if clinic is passed
            AccessFailedCount = 0,
            LockoutEnabled = true
        };

        await _uow.Users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt, user.TenantId);
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
        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        if (!isSuperAdmin)
            throw new UnauthorizedActionException("Only SuperAdmin can create administrator accounts.");

        var currentUserId = _currentUser.UserId ?? throw new UnauthorizedActionException("User not found.");
        var currentUser = await _uow.Users.GetByIdAsync(currentUserId, cancellationToken)
            ?? throw new UnauthorizedActionException("User account not found.");

        var targetTenantId = request.TenantId;

        if (!targetTenantId.HasValue)
            throw new DomainException("A clinic must be selected for the new administrator account.");

        var targetTenant = await _uow.Tenants.GetByIdAsync(targetTenantId.Value, cancellationToken)
            ?? throw new NotFoundException("Tenant", targetTenantId.Value);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _uow.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
            throw new DomainException("A user with this email already exists.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BC.HashPassword(request.Password, workFactor: 12),
            Role = UserRole.Admin,
            TenantId = targetTenant.Id,
            AccessFailedCount = 0,
            LockoutEnabled = true
        };

        await _uow.Users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt, user.TenantId);
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
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _uow.Users.FirstOrDefaultAsync(
            u => u.Email == normalizedEmail,
            cancellationToken);

        if (user == null)
            throw new UnauthorizedActionException("Invalid email or password.");

        // ── 1. Check account lockout ──────────────────────────────────
        if (user.IsLockedOut)
        {
            var remaining = user.LockoutEnd!.Value.Subtract(DateTime.UtcNow);
            var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
            throw new UnauthorizedActionException($"Account is temporarily locked due to multiple failed login attempts. Please try again in {minutes} minute(s).");
        }

        // ── 2. Verify password with constant-time/workfactor ──────────
        if (!BC.Verify(request.Password, user.PasswordHash))
        {
            if (user.LockoutEnabled)
            {
                user.AccessFailedCount++;
                if (user.AccessFailedCount >= 5)
                {
                    user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                }
                await _uow.Users.UpdateAsync(user, cancellationToken);
                await _uow.SaveChangesAsync(cancellationToken);
            }

            throw new UnauthorizedActionException("Invalid email or password.");
        }

        // ── 3. Reset failed count on successful authentication ─────────
        if (user.AccessFailedCount > 0 || user.LockoutEnd.HasValue)
        {
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
        }

        // ── 4. Check clinic activation & subscription ──────────────────
        if (user.TenantId.HasValue && user.Role != UserRole.User && user.Role != UserRole.SuperAdmin)
        {
            var tenant = await _uow.Tenants.GetByIdAsync(user.TenantId.Value, cancellationToken);
            if (tenant != null && !tenant.IsActive)
            {
                var subs = await _uow.ClinicSubscriptions.GetAllAsync(
                    s => s.ClinicId == tenant.Id, cancellationToken);
                var latestSub = subs.OrderByDescending(s => s.CreatedAt).FirstOrDefault();

                if (latestSub == null || latestSub.Status == SubscriptionStatus.PendingPayment)
                    throw new DomainException("Your clinic subscription is pending payment. Please complete the payment to activate your account.");
                
                if (latestSub.Status == SubscriptionStatus.Expired)
                    throw new DomainException("Your clinic subscription has expired. Please renew your subscription.");

                if (latestSub.Status == SubscriptionStatus.Inactive)
                    throw new DomainException("Your clinic subscription has been deactivated. Please contact support.");
            }
        }

        // ── 5. Generate secure tokens & single-use refresh token ───────
        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Role, user.TenantId ?? Guid.Empty);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = _tokenService.HashRefreshToken(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt, user.TenantId);
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
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new UnauthorizedActionException("Invalid refresh token.");

        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);

        var user = await _uow.Users.FirstOrDefaultAsync(
            u => u.RefreshToken == tokenHash,
            cancellationToken);

        if (user == null)
            throw new UnauthorizedActionException("Invalid or revoked refresh token.");

        if (!user.RefreshTokenExpiry.HasValue || user.RefreshTokenExpiry.Value <= DateTime.UtcNow)
        {
            // Invalidate expired token
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _uow.Users.UpdateAsync(user, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedActionException("Refresh token has expired. Please log in again.");
        }

        // Single-use token rotation
        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email, user.Role, user.TenantId ?? Guid.Empty);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = _tokenService.HashRefreshToken(newRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Name, user.Email, ((int)user.Role).ToString(), user.CreatedAt, user.TenantId);
        return new AuthTokenDto(accessToken, newRefreshToken, DateTime.UtcNow.AddMinutes(15), userDto);
    }
}

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly ITokenService _tokenService;

    public LogoutCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser, ITokenService tokenService)
    {
        _uow = uow;
        _currentUser = currentUser;
        _tokenService = tokenService;
    }

    public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        User? user = null;

        if (_currentUser.UserId.HasValue)
        {
            user = await _uow.Users.GetByIdAsync(_currentUser.UserId.Value, cancellationToken);
        }

        if (user == null && !string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);
            user = await _uow.Users.FirstOrDefaultAsync(
                u => u.RefreshToken == tokenHash,
                cancellationToken);
        }

        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _uow.Users.UpdateAsync(user, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}

public class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand, bool>
{
    private readonly IUnitOfWork _uow;
    private readonly ITokenService _tokenService;

    public RevokeTokenCommandHandler(IUnitOfWork uow, ITokenService tokenService)
    {
        _uow = uow;
        _tokenService = tokenService;
    }

    public async Task<bool> Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return false;

        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);
        var user = await _uow.Users.FirstOrDefaultAsync(
            u => u.RefreshToken == tokenHash,
            cancellationToken);

        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _uow.Users.UpdateAsync(user, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
            return true;
        }

        return false;
    }
}

public class GetPatientsQueryHandler : IRequestHandler<GetPatientsQuery, IEnumerable<UserDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetPatientsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<IEnumerable<UserDto>> Handle(GetPatientsQuery request, CancellationToken cancellationToken)
    {
        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        var tenantId = _currentUser.TenantId;

        if (!isSuperAdmin && !tenantId.HasValue)
            throw new UnauthorizedActionException("Tenant context is required to retrieve patient records.");

        var targetTenantId = tenantId.GetValueOrDefault();

        var patients = await _uow.Users.GetAllAsync(
            u => !u.IsDeleted &&
                 (u.Role == UserRole.User || u.Role == UserRole.Patient) &&
                 (isSuperAdmin ? (!tenantId.HasValue || u.TenantId == targetTenantId) : u.TenantId == targetTenantId),
            cancellationToken);

        return patients.Select(u => new UserDto(
            u.Id,
            u.Name,
            u.Email,
            ((int)u.Role).ToString(),
            u.CreatedAt,
            u.TenantId));
    }
}
