using ClinicBookingSystem.Application.Features.Auth;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Identity;
using ClinicBookingSystem.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Xunit;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Tests;

public class AuthenticationSecurityTests
{
    private readonly string _secret = "A_STRONG_32_BYTE_MINIMUM_TEST_SECRET_KEY_123456";
    private readonly string _issuer = "ClinicBookingSystem.API";
    private readonly string _audience = "ClinicBookingSystem.Client";

    private TokenService CreateTokenService()
    {
        var options = Options.Create(new JwtOptions
        {
            Secret = _secret,
            Issuer = _issuer,
            Audience = _audience
        });
        return new TokenService(options);
    }

    private TokenValidationParameters GetValidationParameters()
    {
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ClockSkew = TimeSpan.Zero,
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            ValidIssuer = _issuer,
            ValidAudience = _audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret))
        };
    }

    [Fact]
    public void ValidToken_ValidatesSuccessfully()
    {
        // Arrange
        var tokenService = CreateTokenService();
        var userId = Guid.NewGuid();
        var token = tokenService.GenerateAccessToken(userId, "test@clinic.com", UserRole.Admin, Guid.NewGuid());

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = GetValidationParameters();

        // Act
        var principal = handler.ValidateToken(token, validationParameters, out var validatedToken);

        // Assert
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        var nameIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
        Assert.NotNull(nameIdClaim);
        Assert.Equal(userId.ToString(), nameIdClaim.Value);
    }

    [Fact]
    public void MissingOrEmptyToken_ThrowsExceptionOnValidation()
    {
        // Arrange
        var handler = new JwtSecurityTokenHandler();
        var validationParameters = GetValidationParameters();

        // Act & Assert
        Assert.ThrowsAny<ArgumentException>(() =>
            handler.ValidateToken(string.Empty, validationParameters, out _));
    }

    [Fact]
    public void InvalidMalformedToken_FailsValidation()
    {
        // Arrange
        var handler = new JwtSecurityTokenHandler();
        var validationParameters = GetValidationParameters();
        var malformedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";

        // Act & Assert
        Assert.ThrowsAny<Exception>(() =>
            handler.ValidateToken(malformedToken, validationParameters, out _));
    }

    [Fact]
    public void ExpiredToken_WithZeroClockSkew_ThrowsSecurityTokenExpiredException()
    {
        // Arrange
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiredJwt = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            expires: DateTime.UtcNow.AddSeconds(-10), // Expired 10 seconds ago
            signingCredentials: creds
        );

        var expiredTokenString = new JwtSecurityTokenHandler().WriteToken(expiredJwt);
        var handler = new JwtSecurityTokenHandler();
        var validationParameters = GetValidationParameters();

        // Act & Assert
        Assert.Throws<SecurityTokenExpiredException>(() =>
            handler.ValidateToken(expiredTokenString, validationParameters, out _));
    }

    [Fact]
    public void TamperedTokenPayload_ThrowsSecurityTokenInvalidSignatureException()
    {
        // Arrange
        var tokenService = CreateTokenService();
        var token = tokenService.GenerateAccessToken(Guid.NewGuid(), "test@clinic.com", UserRole.User, Guid.NewGuid());

        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);

        // Tamper with valid Base64Url payload to trigger cryptographic signature mismatch
        var alteredPayloadJson = "{\"role\":\"SuperAdmin\",\"unique_name\":\"attacker\",\"email\":\"attacker@clinic.com\"}";
        var alteredPayloadBase64 = Base64UrlEncoder.Encode(alteredPayloadJson);
        var tamperedToken = $"{parts[0]}.{alteredPayloadBase64}.{parts[2]}";

        var handler = new JwtSecurityTokenHandler();
        var validationParameters = GetValidationParameters();

        // Act & Assert
        Assert.ThrowsAny<SecurityTokenException>(() =>
            handler.ValidateToken(tamperedToken, validationParameters, out _));
    }

    [Fact]
    public async Task RefreshToken_WithRevokedOrInvalidToken_ThrowsUnauthorizedException()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockUserRepo = new Mock<IRepository<User>>();
        var tokenService = CreateTokenService();

        mockUserRepo.Setup(r => r.FirstOrDefaultAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null); // Token not found or revoked

        mockUow.Setup(u => u.Users).Returns(mockUserRepo.Object);

        var handler = new RefreshTokenCommandHandler(mockUow.Object, tokenService);
        var command = new RefreshTokenCommand("some_random_revoked_token");

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));

        Assert.Contains("Invalid or revoked refresh token", ex.Message);
    }

    [Fact]
    public async Task RefreshToken_WithValidToken_RotatesTokenAndUpdatesDatabase()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockUserRepo = new Mock<IRepository<User>>();
        var tokenService = CreateTokenService();

        var initialRawRefreshToken = tokenService.GenerateRefreshToken();
        var initialHash = tokenService.HashRefreshToken(initialRawRefreshToken);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "doctor@clinic.com",
            Role = UserRole.Doctor,
            TenantId = Guid.NewGuid(),
            RefreshToken = initialHash,
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(3)
        };

        mockUserRepo.Setup(r => r.FirstOrDefaultAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        mockUow.Setup(u => u.Users).Returns(mockUserRepo.Object);

        var handler = new RefreshTokenCommandHandler(mockUow.Object, tokenService);
        var command = new RefreshTokenCommand(initialRawRefreshToken);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert - Token Rotated
        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(result.RefreshToken));
        Assert.NotEqual(initialRawRefreshToken, result.RefreshToken); // New token issued
        Assert.NotEqual(initialHash, user.RefreshToken); // Hash updated in DB

        mockUserRepo.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshToken_WithExpiredToken_InvalidatesAndThrowsUnauthorizedException()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockUserRepo = new Mock<IRepository<User>>();
        var tokenService = CreateTokenService();

        var rawRefreshToken = tokenService.GenerateRefreshToken();
        var tokenHash = tokenService.HashRefreshToken(rawRefreshToken);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "expired@clinic.com",
            Role = UserRole.Doctor,
            RefreshToken = tokenHash,
            RefreshTokenExpiry = DateTime.UtcNow.AddMinutes(-5) // Expired 5 mins ago
        };

        mockUserRepo.Setup(r => r.FirstOrDefaultAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        mockUow.Setup(u => u.Users).Returns(mockUserRepo.Object);

        var handler = new RefreshTokenCommandHandler(mockUow.Object, tokenService);
        var command = new RefreshTokenCommand(rawRefreshToken);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));

        Assert.Contains("Refresh token has expired", ex.Message);
        Assert.Null(user.RefreshToken);
        Assert.Null(user.RefreshTokenExpiry);
    }

    [Fact]
    public async Task Login_ConsecutiveFailedAttempts_TriggersAccountLockout()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockUserRepo = new Mock<IRepository<User>>();
        var tokenService = CreateTokenService();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "locked@clinic.com",
            PasswordHash = BC.HashPassword("CorrectPassword123!"),
            Role = UserRole.User,
            AccessFailedCount = 4, // 4 prior failures
            LockoutEnabled = true
        };

        mockUserRepo.Setup(r => r.FirstOrDefaultAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        mockUow.Setup(u => u.Users).Returns(mockUserRepo.Object);

        var handler = new LoginCommandHandler(mockUow.Object, tokenService);
        var wrongLoginCommand = new LoginCommand("locked@clinic.com", "WrongPassword!");

        // Act 5th failure
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(wrongLoginCommand, CancellationToken.None));

        // Assert - User is now locked out
        Assert.Equal(5, user.AccessFailedCount);
        Assert.True(user.IsLockedOut);
        Assert.NotNull(user.LockoutEnd);
        Assert.True(user.LockoutEnd.Value > DateTime.UtcNow);

        // Act 6th attempt while locked out
        var lockedEx = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(wrongLoginCommand, CancellationToken.None));

        Assert.Contains("Account is temporarily locked", lockedEx.Message);
    }

    [Fact]
    public void RegisterValidator_EnforcesStrictPasswordComplexity()
    {
        // Arrange
        var validator = new RegisterCommandValidator();

        // Too short
        var shortResult = validator.Validate(new RegisterCommand("Test", "t@c.com", "Aa1!"));
        Assert.False(shortResult.IsValid);

        // No uppercase
        var noUpperResult = validator.Validate(new RegisterCommand("Test", "t@c.com", "password123!"));
        Assert.False(noUpperResult.IsValid);

        // No number
        var noNumberResult = validator.Validate(new RegisterCommand("Test", "t@c.com", "Password!"));
        Assert.False(noNumberResult.IsValid);

        // No special character
        var noSpecialResult = validator.Validate(new RegisterCommand("Test", "t@c.com", "Password123"));
        Assert.False(noSpecialResult.IsValid);

        // Valid strong password
        var validResult = validator.Validate(new RegisterCommand("Test", "t@c.com", "P@ssw0rd2026!"));
        Assert.True(validResult.IsValid);
    }
}
