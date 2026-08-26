using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Security.Claims;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class TenantResolutionTests
{
    private (TenantProvider Provider, Mock<HttpContext> HttpContextMock, HeaderDictionary Headers) CreateTenantProvider(
        Guid? claimTenantId,
        string? role = "User",
        bool isAuthenticated = true)
    {
        var httpContextMock = new Mock<HttpContext>();
        var requestMock = new Mock<HttpRequest>();
        var headers = new HeaderDictionary();

        requestMock.Setup(r => r.Headers).Returns(headers);
        httpContextMock.Setup(c => c.Request).Returns(requestMock.Object);

        ClaimsPrincipal principal;
        if (isAuthenticated)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
            };

            if (claimTenantId.HasValue)
            {
                claims.Add(new Claim("TenantId", claimTenantId.Value.ToString()));
            }

            if (!string.IsNullOrEmpty(role))
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
                claims.Add(new Claim("role", role));
            }

            var identity = new ClaimsIdentity(claims, "TestJwtAuth");
            principal = new ClaimsPrincipal(identity);
        }
        else
        {
            principal = new ClaimsPrincipal(new ClaimsIdentity()); // Unauthenticated
        }

        httpContextMock.Setup(c => c.User).Returns(principal);

        var accessorMock = new Mock<IHttpContextAccessor>();
        accessorMock.Setup(a => a.HttpContext).Returns(httpContextMock.Object);

        var provider = new TenantProvider(accessorMock.Object);
        return (provider, httpContextMock, headers);
    }

    [Fact]
    public void UserA_WithTenantAClaim_ResolvesToTenantA()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var (provider, _, _) = CreateTenantProvider(tenantA, role: "User", isAuthenticated: true);

        // Act & Assert
        Assert.Equal(tenantA, provider.Id);
        Assert.Equal(tenantA, provider.TenantId);
        Assert.True(provider.IsAvailable);
        Assert.False(provider.IsSuperAdmin);
    }

    [Fact]
    public void UserB_WithTenantBClaim_ResolvesToTenantB()
    {
        // Arrange
        var tenantB = Guid.NewGuid();
        var (provider, _, _) = CreateTenantProvider(tenantB, role: "Doctor", isAuthenticated: true);

        // Act & Assert
        Assert.Equal(tenantB, provider.Id);
        Assert.Equal(tenantB, provider.TenantId);
        Assert.True(provider.IsAvailable);
    }

    [Fact]
    public void UserA_AttemptingToSpoofTenantB_ViaHeader_IsPrevented_StillResolvesToTenantA()
    {
        // Arrange
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var (provider, _, headers) = CreateTenantProvider(tenantA, role: "User", isAuthenticated: true);

        // Attacker injects foreign tenant header
        headers["X-Tenant-Id"] = tenantB.ToString();

        // Act
        var resolvedTenantId = provider.Id;

        // Assert - MUST resolve to verified JWT claim (Tenant A), IGNORING Header (Tenant B)
        Assert.Equal(tenantA, resolvedTenantId);
        Assert.NotEqual(tenantB, resolvedTenantId);
    }

    [Fact]
    public void AuthenticatedUser_WithoutTenantClaim_AttemptingToSpoofTenant_ViaHeader_ReturnsNull()
    {
        // Arrange
        var foreignTenant = Guid.NewGuid();
        var (provider, _, headers) = CreateTenantProvider(claimTenantId: null, role: "User", isAuthenticated: true);

        // Attacker injects header
        headers["X-Tenant-Id"] = foreignTenant.ToString();

        // Act
        var resolvedTenantId = provider.Id;

        // Assert - Header is ignored for authenticated users
        Assert.Null(resolvedTenantId);
        Assert.False(provider.IsAvailable);
    }

    [Fact]
    public void UnauthenticatedGuest_SendingXTenantIdHeader_ResolvesHeaderTenant()
    {
        // Arrange
        var publicClinicId = Guid.NewGuid();
        var (provider, _, headers) = CreateTenantProvider(claimTenantId: null, role: null, isAuthenticated: false);

        headers["X-Tenant-Id"] = publicClinicId.ToString();

        // Act & Assert
        Assert.Equal(publicClinicId, provider.Id);
        Assert.True(provider.IsAvailable);
    }

    [Fact]
    public void UnauthenticatedGuest_WithoutHeader_ResolvesToNull()
    {
        // Arrange
        var (provider, _, _) = CreateTenantProvider(claimTenantId: null, role: null, isAuthenticated: false);

        // Act & Assert
        Assert.Null(provider.Id);
        Assert.False(provider.IsAvailable);
    }

    [Fact]
    public void SuperAdmin_WithoutHeader_HasGlobalNullTenant_AndIsSuperAdminTrue()
    {
        // Arrange
        var (provider, _, _) = CreateTenantProvider(claimTenantId: null, role: "SuperAdmin", isAuthenticated: true);

        // Act & Assert
        Assert.Null(provider.Id);
        Assert.True(provider.IsSuperAdmin);
    }

    [Fact]
    public void SuperAdmin_WithExplicitHeader_CanLegitimatelyTargetTenant()
    {
        // Arrange
        var targetClinicId = Guid.NewGuid();
        var (provider, _, headers) = CreateTenantProvider(claimTenantId: null, role: "SuperAdmin", isAuthenticated: true);

        headers["X-Tenant-Id"] = targetClinicId.ToString();

        // Act & Assert
        Assert.Equal(targetClinicId, provider.Id);
        Assert.True(provider.IsSuperAdmin);
    }

    [Fact]
    public void CurrentTenant_ChangeScope_OverridesTenantAndRestoresOnDispose()
    {
        // Arrange
        var initialTenant = Guid.NewGuid();
        var scopedTenant = Guid.NewGuid();
        var (provider, _, _) = CreateTenantProvider(initialTenant, role: "Admin", isAuthenticated: true);

        Assert.Equal(initialTenant, provider.Id);

        // Act & Assert within scope
        using (provider.Change(scopedTenant))
        {
            Assert.Equal(scopedTenant, provider.Id);
        }

        // Assert restored after disposal
        Assert.Equal(initialTenant, provider.Id);
    }
}
