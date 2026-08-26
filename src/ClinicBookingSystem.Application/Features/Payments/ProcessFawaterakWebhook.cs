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
        if (webHook == null) return false;

        // 1. Verify Cryptographic HMAC Signature
        if (!_paymentService.VerifyWebhook(webHook))
        {
            return false;
        }

        // 2. Parse Payload safely
        if (!string.IsNullOrWhiteSpace(webHook.PayloadString))
        {
            try {
                webHook.Payload = JsonConvert.DeserializeObject<WebhookPayload>(webHook.PayloadString);
            } catch { /* ignore malformed extra payload */ }
        }

        // Only process paid webhooks for activation
        if (!string.Equals(webHook.InvoiceStatus, "paid", StringComparison.OrdinalIgnoreCase))
        {
            return true; // Acknowledge non-paid status safely
        }

        // 3. Find Existing Transaction (Renewal / Regular Subscription)
        var transaction = await _uow.PaymentTransactions.FirstOrDefaultAsync(
            t => t.ExternalInvoiceId == webHook.InvoiceId, cancellationToken);

        if (transaction != null)
        {
            // Idempotency check: Already marked as Paid -> return true without re-executing side effects
            if (transaction.Status == PaymentStatus.Paid)
            {
                return true;
            }

            // State Transition: Must not be an illegal status
            transaction.Status = PaymentStatus.Paid;
            transaction.UpdatedAt = DateTime.UtcNow;

            var subscription = await _uow.ClinicSubscriptions.GetByIdAsync(transaction.SubscriptionId, cancellationToken);
            if (subscription != null)
            {
                var plan = await _uow.Planes.GetByIdAsync(subscription.PlanId, cancellationToken);
                subscription.Status = SubscriptionStatus.Active;
                subscription.ExpiresAt = DateTime.UtcNow.AddDays(plan?.DurationDays ?? 30);
                subscription.PaidAmount = plan?.Price ?? transaction.Amount; // Trust server-side plan price, not webhook amount
                subscription.PaymentRef = $"Fawaterak-{webHook.InvoiceId}";
                subscription.UpdatedAt = DateTime.UtcNow;
                
                await _uow.ClinicSubscriptions.UpdateAsync(subscription, cancellationToken);
            }
            
            await _uow.PaymentTransactions.UpdateAsync(transaction, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
            return true;
        }

        // 4. Case: New Clinic Onboarding Flow (Initial Account Creation)
        if (webHook.Payload?.OrderId != null && Guid.TryParse(webHook.Payload.OrderId, out var onboardingId))
        {
            var pending = await _uow.PendingOnboardings.GetByIdAsync(onboardingId, cancellationToken);
            if (pending != null)
            {
                var onboardingData = JsonConvert.DeserializeObject<OnboardNewClinicCommand>(pending.OnboardingDataJson);
                if (onboardingData != null)
                {
                    var plan = await _uow.Planes.GetByIdAsync(onboardingData.PlanId, cancellationToken);
                    var durationDays = plan?.DurationDays ?? 30;
                    var verifiedPrice = plan?.Price ?? 0m;

                    // a. Create Tenant
                    var tenant = new Tenant
                    {
                        Name = onboardingData.ClinicName,
                        Subdomain = onboardingData.Subdomain,
                        Address = onboardingData.Address,
                        PhoneNumber = onboardingData.Phone,
                        PrimaryColor = onboardingData.PrimaryColor,
                        IsActive = true,
                        SubscriptionExpiry = DateTime.UtcNow.AddDays(durationDays)
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

                    // c. Create Active Subscription (Bound to verified server plan price)
                    var subscription = new ClinicSubscription
                    {
                        ClinicId = tenant.Id,
                        PlanId = onboardingData.PlanId,
                        StartDate = DateTime.UtcNow,
                        ExpiresAt = DateTime.UtcNow.AddDays(durationDays),
                        Status = SubscriptionStatus.Active,
                        PaidAmount = verifiedPrice,
                        PaymentRef = $"Fawaterak-{webHook.InvoiceId}"
                    };
                    await _uow.ClinicSubscriptions.AddAsync(subscription, cancellationToken);

                    // d. Create Paid Transaction record
                    var newTx = new PaymentTransaction
                    {
                        SubscriptionId = subscription.Id,
                        ExternalInvoiceId = webHook.InvoiceId,
                        ExternalInvoiceKey = webHook.InvoiceKey,
                        Amount = verifiedPrice,
                        PaymentMethod = webHook.PaymentMethod,
                        Status = PaymentStatus.Paid
                    };
                    await _uow.PaymentTransactions.AddAsync(newTx, cancellationToken);

                    // e. Delete PendingOnboarding to prevent replay attacks
                    await _uow.PendingOnboardings.DeleteAsync(pending, cancellationToken);
                    
                    await _uow.SaveChangesAsync(cancellationToken);
                    return true;
                }
            }
        }

        return false;
    }
}
