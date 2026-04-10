using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Newtonsoft.Json;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Application.Features.Auth;

public record OnboardNewClinicCommand(
    string ClinicName,
    string Subdomain,
    string Address,
    string Phone,
    string? PrimaryColor,
    string AdminName,
    string AdminEmail,
    string AdminPassword,
    Guid PlanId,
    string SuccessUrl,
    string FailUrl,
    string PendingUrl,
    bool IsTrial = false
) : IRequest<string>; // Returns Payment URL or Status

public class OnboardNewClinicCommandHandler : IRequestHandler<OnboardNewClinicCommand, string>
{
    private readonly IUnitOfWork _uow;
    private readonly IFawaterakPaymentService _paymentService;

    public OnboardNewClinicCommandHandler(IUnitOfWork uow, IFawaterakPaymentService paymentService)
    {
        _uow = uow;
        _paymentService = paymentService;
    }

    public async Task<string> Handle(OnboardNewClinicCommand request, CancellationToken cancellationToken)
    {
        // 1. Validation — ensure no ACTIVE clinic/user exists
        var existingTenants = await _uow.Tenants.GetAllAsync(t => t.Subdomain == request.Subdomain && t.IsActive, cancellationToken);
        if (existingTenants.Any())
            throw new DomainException("This subdomain is already taken.");

        var existingUser = await _uow.Users.GetAllAsync(u => u.Email == request.AdminEmail.ToLowerInvariant(), cancellationToken);
        if (existingUser.Any())
        {
            var eu = existingUser.First();
            if (eu.TenantId.HasValue)
            {
                var userTenant = await _uow.Tenants.GetByIdAsync(eu.TenantId.Value, cancellationToken);
                if (userTenant != null && userTenant.IsActive)
                    throw new DomainException("A user with this email already exists.");
            }
        }

        var plan = await _uow.Planes.GetByIdAsync(request.PlanId, cancellationToken)
            ?? throw new NotFoundException("Plan", request.PlanId);

        // ─── Trial Flow (Skip Payment) ───
        if (request.IsTrial)
        {
            var tenant = new Tenant
            {
                Name = request.ClinicName,
                Subdomain = request.Subdomain,
                Address = request.Address,
                PhoneNumber = request.Phone,
                PrimaryColor = request.PrimaryColor ?? "#3b82f6",
                IsActive = true,
                SubscriptionExpiry = DateTime.UtcNow.AddDays(7)
            };

            await _uow.Tenants.AddAsync(tenant, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);

            var admin = new User
            {
                Name = request.AdminName,
                Email = request.AdminEmail.ToLowerInvariant(),
                PasswordHash = BC.HashPassword(request.AdminPassword),
                Role = UserRole.Admin,
                TenantId = tenant.Id,
                PhoneNumber = request.Phone
            };

            await _uow.Users.AddAsync(admin, cancellationToken);

            var subscription = new ClinicSubscription
            {
                ClinicId = tenant.Id,
                PlanId = request.PlanId,
                Status = SubscriptionStatus.Trial,
                StartDate = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                PaymentRef = "TRIAL",
                PaidAmount = 0
            };

            await _uow.ClinicSubscriptions.AddAsync(subscription, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);

            return "trial_success";
        }

        // ─── Paid Flow (Fawaterak) ───
        var onboardingId = Guid.NewGuid();
        var pendingOnboarding = new PendingOnboarding
        {
            Id = onboardingId,
            Subdomain = request.Subdomain,
            AdminEmail = request.AdminEmail.ToLowerInvariant(),
            OnboardingDataJson = JsonConvert.SerializeObject(request),
            ExpiresAt = DateTime.UtcNow.AddDays(1) // Expire after 24h
        };

        // Clean up any old pending attempts for same data
        var oldAttempts = await _uow.PendingOnboardings.GetAllAsync(
            p => p.Subdomain == request.Subdomain || p.AdminEmail == request.AdminEmail.ToLowerInvariant(), 
            cancellationToken);
        
        foreach (var old in oldAttempts)
            await _uow.PendingOnboardings.DeleteAsync(old, cancellationToken);

        await _uow.PendingOnboardings.AddAsync(pendingOnboarding, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var invoiceRequest = new EInvoiceRequestModel
        {
            Customer = new EInvoiceRequestModel.CustomerModel
            {
                FirstName = request.AdminName.Split(' ').FirstOrDefault() ?? request.AdminName,
                LastName = request.AdminName.Split(' ').LastOrDefault() ?? "ClinicAdmin",
                Email = request.AdminEmail,
                Phone = request.Phone
            },
            CartItems = new List<EInvoiceRequestModel.CartItemModel>
            {
                new EInvoiceRequestModel.CartItemModel
                {
                    Name = $"Clinic Registration: {plan.Name}",
                    Price = plan.Price,
                    Quantity = 1
                }
            },
            PayLoad = new EInvoiceRequestModel.InvoicePayload
            {
                OrderId = onboardingId.ToString() // Use PendingOnboarding ID as OrderId
            },
            RedirectionUrls = new EInvoiceRequestModel.RedirectionUrlsModel
            {
                OnSuccess = request.SuccessUrl,
                OnFailure = request.FailUrl,
                OnPending = request.PendingUrl
            }
        };

        var response = await _paymentService.CreateEInvoiceAsync(invoiceRequest);
        if (response == null)
            throw new DomainException("Failed to generate payment link via Fawaterak.");

        return response.Url;
    }
}
