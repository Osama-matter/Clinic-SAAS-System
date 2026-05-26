using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicBookingSystem.API.Filters;

[AttributeUsage(AttributeTargets.Method)]
public class CheckPlanLimitAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _featureCode;

    public CheckPlanLimitAttribute(string featureCode)
    {
        _featureCode = featureCode;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var tenantProvider = context.HttpContext.RequestServices.GetRequiredService<ITenantProvider>();
        var planService = context.HttpContext.RequestServices.GetRequiredService<IPlanService>();

        if (tenantProvider.Role == UserRole.SuperAdmin || 
            context.ActionDescriptor.EndpointMetadata.Any(em => em is Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute))
        {
            await next();
            return;
        }

        if (tenantProvider.TenantId == null)
        {
            context.Result = new UnauthorizedObjectResult("No tenant identified.");
            return;
        }

        var isWithinLimit = await planService.CheckLimitAsync(tenantProvider.TenantId.Value, _featureCode);

        if (!isWithinLimit)
        {
            context.Result = new BadRequestObjectResult(new { 
                error = "Plan limit reached", 
                message = $"You have reached the maximum allowed for '{_featureCode}' in your current plan. Please upgrade to continue." 
            });
            return;
        }

        await next();
    }
}
