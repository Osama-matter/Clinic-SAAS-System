using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Application.Features.Payments;

public record InitiateSubscriptionPaymentCommand(
    Guid ClinicId,
    Guid PlanId,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string SuccessUrl,
    string FailUrl) : IRequest<string>;

public class InitiateSubscriptionPaymentHandler : IRequestHandler<InitiateSubscriptionPaymentCommand, string>
{
    private readonly IUnitOfWork _uow;
    private readonly IFawaterakPaymentService _paymentService;

    public InitiateSubscriptionPaymentHandler(IUnitOfWork uow, IFawaterakPaymentService paymentService)
    {
        _uow = uow;
        _paymentService = paymentService;
    }

    public async Task<string> Handle(InitiateSubscriptionPaymentCommand request, CancellationToken cancellationToken)
    {
        var tenant = await _uow.Tenants.GetByIdAsync(request.ClinicId, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.ClinicId);

        var plan = await _uow.Planes.GetByIdAsync(request.PlanId, cancellationToken)
            ?? throw new NotFoundException(nameof(Plan), request.PlanId);

        // 1. Create Pending Subscription
        var subscription = new ClinicSubscription
        {
            ClinicId = tenant.Id,
            PlanId = plan.Id,
            Status = SubscriptionStatus.PendingPayment,
            StartDate = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow, // Will be updated on payment success
            PaidAmount = plan.Price,
            PaymentRef = "Fawaterak-Pending"
        };

        await _uow.ClinicSubscriptions.AddAsync(subscription, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // 2. Prepare Fawaterak Request
        var fawaterakRequest = new EInvoiceRequestModel
        {
            Customer = new EInvoiceRequestModel.CustomerModel
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Phone = request.Phone,
                CustomerId = tenant.Id.ToString()
            },
            CartItems = new List<EInvoiceRequestModel.CartItemModel>
            {
                new EInvoiceRequestModel.CartItemModel
                {
                    Name = $"Subscription: {plan.Name}",
                    Price = plan.Price,
                    Quantity = 1
                }
            },
            PayLoad = new EInvoiceRequestModel.InvoicePayload
            {
                OrderId = subscription.Id.ToString() // Important for Webhook
            },
            RedirectionUrls = new EInvoiceRequestModel.RedirectionUrlsModel
            {
                OnSuccess = request.SuccessUrl,
                OnFailure = request.FailUrl,
                OnPending = request.FailUrl
            }
        };

        // 3. Call Fawaterak
        var fawaterakResponse = await _paymentService.CreateEInvoiceAsync(fawaterakRequest);
        if (fawaterakResponse == null)
            throw new Exception("Failed to initiate payment with Fawaterak.");

        // 4. Record Transaction
        var transaction = new PaymentTransaction
        {
            SubscriptionId = subscription.Id,
            ExternalInvoiceId = long.Parse(fawaterakResponse.InvoiceId),
            ExternalInvoiceKey = fawaterakResponse.InvoiceKey,
            Amount = plan.Price,
            Status = PaymentStatus.Pending,
            PaymentMethod = "Fawaterak"
        };

        await _uow.PaymentTransactions.AddAsync(transaction, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return fawaterakResponse.Url;
    }
}
