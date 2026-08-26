using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Features.Appointments;
using ClinicBookingSystem.Application.Features.Auth;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using System.Security.Claims;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class AuthorizationPolicyTests
{
    private readonly IAuthorizationService _authorizationService;

    public AuthorizationPolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorizationCore(opt =>
        {
            opt.AddPolicy(AppPolicies.SuperAdminOnly, policy =>
                policy.RequireRole(AppRoles.SuperAdmin, "6"));

            opt.AddPolicy(AppPolicies.AdminOnly, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.SuperAdmin, "2", "6"));

            opt.AddPolicy(AppPolicies.StaffOnly, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Receptionist, AppRoles.Doctor, AppRoles.SuperAdmin, "2", "3", "4", "6"));

            opt.AddPolicy(AppPolicies.DoctorOnly, policy =>
                policy.RequireRole(AppRoles.Doctor, AppRoles.Admin, AppRoles.SuperAdmin, "4", "2", "6"));

            opt.AddPolicy(AppPolicies.UserOrAdmin, policy =>
                policy.RequireRole(AppRoles.User, AppRoles.Admin, AppRoles.SuperAdmin, "1", "2", "6", "0"));
        });

        var provider = services.BuildServiceProvider();
        _authorizationService = provider.GetRequiredService<IAuthorizationService>();
    }

    private ClaimsPrincipal CreatePrincipal(string? role, bool isAuthenticated = true)
    {
        if (!isAuthenticated)
            return new ClaimsPrincipal(new ClaimsIdentity());

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrEmpty(role))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var identity = new ClaimsIdentity(claims, "TestAuthType");
        return new ClaimsPrincipal(identity);
    }

    // ── 1. Anonymous -> Protected Policy = DENIED ─────────

    [Theory]
    [InlineData(AppPolicies.SuperAdminOnly)]
    [InlineData(AppPolicies.AdminOnly)]
    [InlineData(AppPolicies.StaffOnly)]
    [InlineData(AppPolicies.DoctorOnly)]
    [InlineData(AppPolicies.UserOrAdmin)]
    public async Task AnonymousUser_AccessProtectedPolicy_IsDenied(string policyName)
    {
        var anonymous = CreatePrincipal(null, isAuthenticated: false);
        var result = await _authorizationService.AuthorizeAsync(anonymous, policyName);
        Assert.False(result.Succeeded);
    }

    // ── 2. Normal User (Patient) -> Admin / Staff Policy = DENIED ──

    [Theory]
    [InlineData(AppPolicies.SuperAdminOnly)]
    [InlineData(AppPolicies.AdminOnly)]
    [InlineData(AppPolicies.StaffOnly)]
    [InlineData(AppPolicies.DoctorOnly)]
    public async Task NormalPatientUser_AccessPrivilegedPolicy_IsDenied(string policyName)
    {
        var patient = CreatePrincipal(AppRoles.User);
        var result = await _authorizationService.AuthorizeAsync(patient, policyName);
        Assert.False(result.Succeeded);
    }

    // ── 3. Tenant Admin -> Allowed for Admin/Staff, Denied for SuperAdmin ──

    [Fact]
    public async Task TenantAdmin_AccessAdminAndStaffPolicies_IsAllowed()
    {
        var admin = CreatePrincipal(AppRoles.Admin);

        var adminPolicyResult = await _authorizationService.AuthorizeAsync(admin, AppPolicies.AdminOnly);
        var staffPolicyResult = await _authorizationService.AuthorizeAsync(admin, AppPolicies.StaffOnly);

        Assert.True(adminPolicyResult.Succeeded);
        Assert.True(staffPolicyResult.Succeeded);
    }

    [Fact]
    public async Task TenantAdmin_AccessSuperAdminOnlyPolicy_IsDenied()
    {
        var admin = CreatePrincipal(AppRoles.Admin);
        var result = await _authorizationService.AuthorizeAsync(admin, AppPolicies.SuperAdminOnly);
        Assert.False(result.Succeeded);
    }

    // ── 4. SuperAdmin -> Allowed across all administrative policies ──

    [Theory]
    [InlineData(AppPolicies.SuperAdminOnly)]
    [InlineData(AppPolicies.AdminOnly)]
    [InlineData(AppPolicies.StaffOnly)]
    [InlineData(AppPolicies.DoctorOnly)]
    [InlineData(AppPolicies.UserOrAdmin)]
    public async Task SuperAdmin_AccessAllPolicies_IsAllowed(string policyName)
    {
        var superAdmin = CreatePrincipal(AppRoles.SuperAdmin);
        var result = await _authorizationService.AuthorizeAsync(superAdmin, policyName);
        Assert.True(result.Succeeded);
    }

    // ── 5. Doctor Role -> Allowed on DoctorOnly & StaffOnly, Denied on Admin/SuperAdmin ──

    [Fact]
    public async Task Doctor_AccessDoctorAndStaffPolicies_IsAllowed()
    {
        var doctor = CreatePrincipal(AppRoles.Doctor);

        var doctorResult = await _authorizationService.AuthorizeAsync(doctor, AppPolicies.DoctorOnly);
        var staffResult = await _authorizationService.AuthorizeAsync(doctor, AppPolicies.StaffOnly);

        Assert.True(doctorResult.Succeeded);
        Assert.True(staffResult.Succeeded);
    }

    [Fact]
    public async Task Doctor_AccessAdminOrSuperAdminPolicies_IsDenied()
    {
        var doctor = CreatePrincipal(AppRoles.Doctor);

        var adminResult = await _authorizationService.AuthorizeAsync(doctor, AppPolicies.AdminOnly);
        var superAdminResult = await _authorizationService.AuthorizeAsync(doctor, AppPolicies.SuperAdminOnly);

        Assert.False(adminResult.Succeeded);
        Assert.False(superAdminResult.Succeeded);
    }

    // ── 6. Handler Level Privilege Escalation Regression Tests ──

    [Fact]
    public async Task UpdateAppointmentStatus_ByNormalPatient_ThrowsUnauthorizedActionException()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockCurrentUser = new Mock<ICurrentUserService>();
        var mockEmail = new Mock<IEmailService>();

        mockCurrentUser.Setup(u => u.Role).Returns(AppRoles.User); // Regular patient
        mockCurrentUser.Setup(u => u.UserId).Returns(Guid.NewGuid());

        var handler = new UpdateAppointmentStatusCommandHandler(mockUow.Object, mockCurrentUser.Object, mockEmail.Object);
        var command = new UpdateAppointmentStatusCommand(Guid.NewGuid(), AppointmentStatus.Confirmed, IsPaid: true);

        // Act & Assert - Normal patient cannot update status or payment
        var ex = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));

        Assert.Contains("Only clinic staff or administrators can update appointment statuses", ex.Message);
    }

    [Fact]
    public async Task CreateAdmin_ByNonSuperAdmin_ThrowsUnauthorizedActionException()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var mockCurrentUser = new Mock<ICurrentUserService>();

        mockCurrentUser.Setup(u => u.Role).Returns(AppRoles.Admin); // Regular Clinic Admin, not SuperAdmin
        mockCurrentUser.Setup(u => u.UserId).Returns(Guid.NewGuid());

        var handler = new CreateAdminCommandHandler(mockUow.Object, mockCurrentUser.Object);
        var command = new CreateAdminCommand("New Admin", "admin2@clinic.com", "P@ssword123!", Guid.NewGuid());

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            handler.Handle(command, CancellationToken.None));

        Assert.Contains("Only SuperAdmin can create administrator accounts", ex.Message);
    }
}
