using ClinicBookingSystem.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicBookingSystem.API.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireActiveSubscriptionAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var tenantProvider = context.HttpContext.RequestServices.GetRequiredService<ITenantProvider>();
        var planService = context.HttpContext.RequestServices.GetRequiredService<IPlanService>();

        if (tenantProvider.TenantId == null)
        {
            context.Result = new UnauthorizedObjectResult("No tenant identified.");
            return;
        }

        var isActive = await planService.IsSubscriptionActiveAsync(tenantProvider.TenantId.Value);

        if (!isActive)
        {
            context.Result = new ObjectResult(new { 
                error = "Subscription required", 
                message = "Your subscription is either expired or inactive. Please renew to continue." 
            }) { StatusCode = 402 }; // 402 Payment Required
            return;
        }

        await next();
    }
}
