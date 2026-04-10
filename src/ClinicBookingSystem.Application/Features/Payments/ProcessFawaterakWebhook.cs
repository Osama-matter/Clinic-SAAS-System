using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Application.Features.Auth;
using MediatR;
using Newtonsoft.Json;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Application.Features.Payments;

public record ProcessFawaterakWebhookCommand(WebHookModel WebHook) : IRequest<bool>;

public class ProcessFawaterakWebhookHandler : IRequestHandler<ProcessFawaterakWebhookCommand, bool>
{
    private readonly IUnitOfWork _uow;
    private readonly IFawaterakPaymentService _paymentService;

    public ProcessFawaterakWebhookHandler(IUnitOfWork uow, IFawaterakPaymentService paymentService)
    {
        _uow = uow;
        _paymentService = paymentService;
    }

    public async Task<bool> Handle(ProcessFawaterakWebhookCommand request, CancellationToken cancellationToken)
    {
        var webHook = request.WebHook;

        // 1. Verify Hash
        if (!_paymentService.VerifyWebhook(webHook))
        {
            return false;
        }

        // 2. Parse Payload
        if (!string.IsNullOrEmpty(webHook.PayloadString))
        {
            try {
                webHook.Payload = JsonConvert.DeserializeObject<WebhookPayload>(webHook.PayloadString);
            } catch { /* ignore malformed payload */ }
        }

        if (!webHook.InvoiceStatus.Equals("paid", StringComparison.OrdinalIgnoreCase))
        {
            return true; // We only handle non-paid for existing transactions (logging/updating status)
        }

        // 3. Find Transaction (Existing/Renewal)
        var transaction = (await _uow.PaymentTransactions.GetAllAsync(
            t => t.ExternalInvoiceId == webHook.InvoiceId, cancellationToken))
            .FirstOrDefault();

        if (transaction != null)
        {
            if (transaction.Status == PaymentStatus.Paid) return true;

            transaction.Status = PaymentStatus.Paid;
            transaction.UpdatedAt = DateTime.UtcNow;

            var subscription = await _uow.ClinicSubscriptions.GetByIdAsync(transaction.SubscriptionId, cancellationToken);
            if (subscription != null)
            {
                var plan = await _uow.Planes.GetByIdAsync(subscription.PlanId, cancellationToken);
                subscription.Status = SubscriptionStatus.Active;
                subscription.ExpiresAt = DateTime.UtcNow.AddDays(plan?.DurationDays ?? 30);
                await _uow.ClinicSubscriptions.UpdateAsync(subscription, cancellationToken);
            }
            
            await _uow.PaymentTransactions.UpdateAsync(transaction, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
            return true;
        }

        // 4. Case: New Onboarding (Transaction doesn't exist yet)
        if (webHook.Payload?.OrderId != null && Guid.TryParse(webHook.Payload.OrderId, out var onboardingId))
        {
            var pending = await _uow.PendingOnboardings.GetByIdAsync(onboardingId, cancellationToken);
            if (pending != null)
            {
                var onboardingData = JsonConvert.DeserializeObject<OnboardNewClinicCommand>(pending.OnboardingDataJson);
                if (onboardingData != null)
                {
                    // a. Create Tenant
                    var tenant = new Tenant
                    {
                        Name = onboardingData.ClinicName,
                        Subdomain = onboardingData.Subdomain,
                        Address = onboardingData.Address,
                        PhoneNumber = onboardingData.Phone,
                        PrimaryColor = onboardingData.PrimaryColor,
                        IsActive = true,
                        SubscriptionExpiry = DateTime.UtcNow.AddYears(1) // Backup value
                    };
                    await _uow.Tenants.AddAsync(tenant, cancellationToken);

                    // b. Create Admin User
                    var admin = new User
                    {
                        Name = onboardingData.AdminName,
                        Email = onboardingData.AdminEmail.ToLowerInvariant(),
                        PasswordHash = BC.HashPassword(onboardingData.AdminPassword, 12),
                        Role = UserRole.Admin,
                        TenantId = tenant.Id
                    };
                    await _uow.Users.AddAsync(admin, cancellationToken);

                    // c. Create Active Subscription
                    var plan = await _uow.Planes.GetByIdAsync(onboardingData.PlanId, cancellationToken);
                    var subscription = new ClinicSubscription
                    {
                        ClinicId = tenant.Id,
                        PlanId = onboardingData.PlanId,
                        StartDate = DateTime.UtcNow,
                        ExpiresAt = DateTime.UtcNow.AddDays(plan?.DurationDays ?? 30),
                        Status = SubscriptionStatus.Active,
                        PaidAmount = plan?.Price ?? 0,
                        PaymentRef = $"Fawaterak-{webHook.InvoiceId}"
                    };
                    await _uow.ClinicSubscriptions.AddAsync(subscription, cancellationToken);

                    // d. Create Paid Transaction record
                    var newTx = new PaymentTransaction
                    {
                        SubscriptionId = subscription.Id,
                        ExternalInvoiceId = webHook.InvoiceId,
                        ExternalInvoiceKey = webHook.InvoiceKey,
                        Amount = plan?.Price ?? 0,
                        PaymentMethod = webHook.PaymentMethod,
                        Status = PaymentStatus.Paid
                    };
                    await _uow.PaymentTransactions.AddAsync(newTx, cancellationToken);

                    // e. Cleanup
                    await _uow.PendingOnboardings.DeleteAsync(pending, cancellationToken);
                    
                    await _uow.SaveChangesAsync(cancellationToken);
                    return true;
                }
            }
        }

        return false;
    }
}
