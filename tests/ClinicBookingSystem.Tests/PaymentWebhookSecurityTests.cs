using ClinicBookingSystem.Application.Features.Payments;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Payments.Fawaterak;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.Security.Cryptography;
using System.Text;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class PaymentWebhookSecurityTests
{
    private const string TestApiKey = "test_fawaterak_api_secret_key_123456";
    private readonly string _sharedDbName = $"PaymentDb_{Guid.NewGuid():N}";
    private readonly Guid _clinicId = Guid.NewGuid();
    private readonly Guid _planId = Guid.NewGuid();
    private readonly Guid _subscriptionId = Guid.NewGuid();
    private readonly long _invoiceId = 99887766;
    private readonly string _invoiceKey = "INV-KEY-XYZ-123";

    public PaymentWebhookSecurityTests()
    {
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        using var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);

        var plan = new Plan
        {
            Id = _planId,
            Name = "Gold Tier",
            Price = 250m,
            DurationDays = 60,
            MaxDoctors = 20,
            MaxPatients = 500,
            MaxBookings = 1000,
            IsActive = true
        };
        dbContext.Plans.Add(plan);

        var subscription = new ClinicSubscription
        {
            Id = _subscriptionId,
            ClinicId = _clinicId,
            PlanId = plan.Id,
            Status = SubscriptionStatus.PendingPayment,
            StartDate = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow,
            PaidAmount = 250m,
            PaymentRef = "Pending"
        };
        dbContext.ClinicSubscriptions.Add(subscription);

        var transaction = new PaymentTransaction
        {
            SubscriptionId = subscription.Id,
            ExternalInvoiceId = _invoiceId,
            ExternalInvoiceKey = _invoiceKey,
            Amount = 250m,
            PaymentMethod = "CreditCard",
            Status = PaymentStatus.Pending
        };
        dbContext.PaymentTransactions.Add(transaction);

        dbContext.SaveChanges();
    }

    private (IUnitOfWork Uow, IFawaterakPaymentService PaymentService) CreateContext()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Id).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        var fawaterakOptions = Options.Create(new FawaterakOptions
        {
            ApiKey = TestApiKey,
            BaseUrl = "https://staging.fawaterk.com/api/v2",
            ProviderKey = "test_provider"
        });

        var httpFactoryMock = new Mock<IHttpClientFactory>();
        var loggerMock = new Mock<ILogger<FawaterakPaymentService>>();
        var paymentService = new FawaterakPaymentService(httpFactoryMock.Object, loggerMock.Object, fawaterakOptions);

        return (uow, paymentService);
    }

    private string GenerateValidHashKey(long invoiceId, string invoiceKey, string paymentMethod)
    {
        var queryParam = $"InvoiceId={invoiceId}&InvoiceKey={invoiceKey}&PaymentMethod={paymentMethod}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(TestApiKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryParam));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    [Fact]
    public async Task Webhook_WithInvalidSignature_IsRejected()
    {
        var (uow, paymentService) = CreateContext();
        var handler = new ProcessFawaterakWebhookHandler(uow, paymentService);

        var webhook = new WebHookModel
        {
            InvoiceId = _invoiceId,
            InvoiceKey = _invoiceKey,
            PaymentMethod = "CreditCard",
            InvoiceStatus = "paid",
            HashKey = "FORGED_SIGNATURE_ATTACK_KEY"
        };

        // Act
        var result = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook), CancellationToken.None);

        // Assert - Rejected immediately
        Assert.False(result);

        // State remains unchanged
        var tx = await uow.PaymentTransactions.FirstOrDefaultAsync(t => t.ExternalInvoiceId == _invoiceId, CancellationToken.None);
        Assert.Equal(PaymentStatus.Pending, tx!.Status);
    }

    [Fact]
    public async Task Webhook_WithValidSignature_ActivatesSubscription()
    {
        var (uow, paymentService) = CreateContext();
        var handler = new ProcessFawaterakWebhookHandler(uow, paymentService);

        var validHash = GenerateValidHashKey(_invoiceId, _invoiceKey, "CreditCard");

        var webhook = new WebHookModel
        {
            InvoiceId = _invoiceId,
            InvoiceKey = _invoiceKey,
            PaymentMethod = "CreditCard",
            InvoiceStatus = "paid",
            HashKey = validHash
        };

        // Act
        var result = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook), CancellationToken.None);

        // Assert
        Assert.True(result);

        var tx = await uow.PaymentTransactions.FirstOrDefaultAsync(t => t.ExternalInvoiceId == _invoiceId, CancellationToken.None);
        Assert.Equal(PaymentStatus.Paid, tx!.Status);

        var sub = await uow.ClinicSubscriptions.GetByIdAsync(_subscriptionId, CancellationToken.None);
        Assert.Equal(SubscriptionStatus.Active, sub!.Status);
        Assert.Equal(250m, sub.PaidAmount);
        Assert.True(sub.ExpiresAt > DateTime.UtcNow.AddDays(50));
    }

    [Fact]
    public async Task Webhook_DuplicateOrReplay_IsIdempotentAndDoesNotDuplicateState()
    {
        var (uow, paymentService) = CreateContext();
        var handler = new ProcessFawaterakWebhookHandler(uow, paymentService);

        var validHash = GenerateValidHashKey(_invoiceId, _invoiceKey, "CreditCard");

        var webhook = new WebHookModel
        {
            InvoiceId = _invoiceId,
            InvoiceKey = _invoiceKey,
            PaymentMethod = "CreditCard",
            InvoiceStatus = "paid",
            HashKey = validHash
        };

        // Act - Call webhook multiple times (replay)
        var result1 = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook), CancellationToken.None);
        var result2 = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook), CancellationToken.None);

        // Assert - Both succeed idempotently without error
        Assert.True(result1);
        Assert.True(result2);

        var tx = await uow.PaymentTransactions.FirstOrDefaultAsync(t => t.ExternalInvoiceId == _invoiceId, CancellationToken.None);
        Assert.Equal(PaymentStatus.Paid, tx!.Status);
    }
}
