using ClinicBookingSystem.Domain.Enums;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System.Security.Claims;

namespace ClinicBookingSystem.API.Filters;

public class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    private readonly IWebHostEnvironment _environment;

    public HangfireDashboardAuthorizationFilter(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Allow localhost in development mode
        if (_environment.IsDevelopment())
        {
            return true;
        }

        // In Production/Staging, require authenticated SuperAdmin role
        var user = httpContext.User;
        if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
        {
            return false;
        }

        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
        return roleClaim == nameof(UserRole.SuperAdmin) || roleClaim == ((int)UserRole.SuperAdmin).ToString();
    }
}
