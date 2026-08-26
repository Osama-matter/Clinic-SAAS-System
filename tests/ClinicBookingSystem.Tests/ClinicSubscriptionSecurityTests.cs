using ClinicBookingSystem.Application.Features.Auth;
using ClinicBookingSystem.Application.Features.Payments;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class ClinicSubscriptionSecurityTests
{
    private (ApplicationDbContext DbContext, IUnitOfWork UnitOfWork) CreateTestContext(string? dbName = null)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns((Guid?)null);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.SuperAdmin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? $"ClinicSubSecDb_{Guid.NewGuid()}")
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(dbContext);

        return (dbContext, uow);
    }

    [Fact]
    public void Test1_NewClinicSubscription_ReceivesNonEmptyGuidId()
    {
        // Arrange & Act
        var subscription = new ClinicSubscription();

        // Assert - Id must NOT be Guid.Empty
        Assert.NotEqual(Guid.Empty, subscription.Id);
    }

    [Fact]
    public void Test2_TwoNewlyCreatedClinicSubscriptions_ReceiveDifferentIds()
    {
        // Arrange & Act
        var sub1 = new ClinicSubscription();
        var sub2 = new ClinicSubscription();

        // Assert - Both must be distinct and non-empty
        Assert.NotEqual(Guid.Empty, sub1.Id);
        Assert.NotEqual(Guid.Empty, sub2.Id);
        Assert.NotEqual(sub1.Id, sub2.Id);
    }

    [Fact]
    public async Task Test3_TwoClinics_CanCreateSubscriptions_WithoutPrimaryKeyCollision()
    {
        // Arrange
        var dbName = $"SubCollDb_{Guid.NewGuid()}";
        var (db, uow) = CreateTestContext(dbName);

        var clinicA = new Tenant { Name = "Clinic Alpha", Subdomain = "alpha", IsActive = true };
        var clinicB = new Tenant { Name = "Clinic Beta", Subdomain = "beta", IsActive = true };
        await db.Tenants.AddRangeAsync(clinicA, clinicB);

        var plan = new Plan { Name = "Standard", Price = 500, DurationDays = 30, IsActive = true };
        await db.Plans.AddAsync(plan);
        await db.SaveChangesAsync();

        var subA = new ClinicSubscription
        {
            ClinicId = clinicA.Id,
            PlanId = plan.Id,
            StartDate = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            Status = SubscriptionStatus.Active,
            PaidAmount = 500,
            PaymentRef = "REF-A"
        };

        var subB = new ClinicSubscription
        {
            ClinicId = clinicB.Id,
            PlanId = plan.Id,
            StartDate = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            Status = SubscriptionStatus.Active,
            PaidAmount = 500,
            PaymentRef = "REF-B"
        };

        // Act - Add both subscriptions
        await uow.ClinicSubscriptions.AddAsync(subA);
        await uow.ClinicSubscriptions.AddAsync(subB);
        await uow.SaveChangesAsync();

        // Assert - Both subscriptions saved with distinct PKs
        var allSubs = await db.ClinicSubscriptions.ToListAsync();
        Assert.Equal(2, allSubs.Count);
        Assert.NotEqual(subA.Id, subB.Id);
        Assert.NotEqual(Guid.Empty, subA.Id);
        Assert.NotEqual(Guid.Empty, subB.Id);
    }

    [Fact]
    public async Task Test4_ProcessFawaterakWebhook_CreatesSubscriptionsForMultipleClinics_WithoutCollision()
    {
        // Arrange
        var dbName = $"FawaterakSubDb_{Guid.NewGuid()}";
        var (db, uow) = CreateTestContext(dbName);

        var plan = new Plan { Name = "Pro Plan", Price = 500, DurationDays = 30, IsActive = true };
        await db.Plans.AddAsync(plan);
        await db.SaveChangesAsync();

        var paymentServiceMock = new Mock<IFawaterakPaymentService>();
        paymentServiceMock
            .Setup(p => p.VerifyWebhook(It.IsAny<WebHookModel>()))
            .Returns(true);

        var handler = new ProcessFawaterakWebhookHandler(uow, paymentServiceMock.Object);

        // Setup Onboarding 1
        var onboardingId1 = Guid.NewGuid();
        var onboarding1 = new PendingOnboarding
        {
            Id = onboardingId1,
            Subdomain = "clinic1",
            AdminEmail = "admin1@clinic.com",
            OnboardingDataJson = JsonConvert.SerializeObject(new OnboardNewClinicCommand(
                "Clinic One",
                "clinic1",
                "Address 1",
                "01011111111",
                null,
                "Dr. One",
                "admin1@clinic.com",
                "Password123!",
                plan.Id,
                "https://success.com",
                "https://fail.com",
                "https://pending.com"
            )),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        // Setup Onboarding 2
        var onboardingId2 = Guid.NewGuid();
        var onboarding2 = new PendingOnboarding
        {
            Id = onboardingId2,
            Subdomain = "clinic2",
            AdminEmail = "admin2@clinic.com",
            OnboardingDataJson = JsonConvert.SerializeObject(new OnboardNewClinicCommand(
                "Clinic Two",
                "clinic2",
                "Address 2",
                "01022222222",
                null,
                "Dr. Two",
                "admin2@clinic.com",
                "Password123!",
                plan.Id,
                "https://success.com",
                "https://fail.com",
                "https://pending.com"
            )),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        await db.PendingOnboardings.AddRangeAsync(onboarding1, onboarding2);
        await db.SaveChangesAsync();

        // Act - Process webhook for Clinic 1
        var webhook1 = new WebHookModel
        {
            InvoiceId = 1001,
            InvoiceKey = "KEY-1",
            InvoiceStatus = "paid",
            PaymentMethod = "card",
            Payload = new WebhookPayload { OrderId = onboardingId1.ToString() }
        };

        var result1 = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook1), CancellationToken.None);
        Assert.True(result1);

        // Act - Process webhook for Clinic 2
        var webhook2 = new WebHookModel
        {
            InvoiceId = 1002,
            InvoiceKey = "KEY-2",
            InvoiceStatus = "paid",
            PaymentMethod = "card",
            Payload = new WebhookPayload { OrderId = onboardingId2.ToString() }
        };

        var result2 = await handler.Handle(new ProcessFawaterakWebhookCommand(webhook2), CancellationToken.None);
        Assert.True(result2);

        // Assert - Two distinct subscriptions and two payment transactions created
        var subscriptions = await db.ClinicSubscriptions.ToListAsync();
        Assert.Equal(2, subscriptions.Count);
        Assert.NotEqual(subscriptions[0].Id, subscriptions[1].Id);
        Assert.NotEqual(Guid.Empty, subscriptions[0].Id);
        Assert.NotEqual(Guid.Empty, subscriptions[1].Id);

        var transactions = await db.PaymentTransactions.ToListAsync();
        Assert.Equal(2, transactions.Count);
        Assert.NotEqual(transactions[0].SubscriptionId, transactions[1].SubscriptionId);
        Assert.NotEqual(Guid.Empty, transactions[0].SubscriptionId);
        Assert.NotEqual(Guid.Empty, transactions[1].SubscriptionId);
    }

    [Fact]
    public void Test5_EfCoreMetadata_IdentifiesExactlyOnePrimaryKey_InheritedFromBaseEntity()
    {
        // Arrange
        var (db, _) = CreateTestContext();

        // Act
        var entityType = db.Model.FindEntityType(typeof(ClinicSubscription));
        Assert.NotNull(entityType);

        var primaryKey = entityType.FindPrimaryKey();
        Assert.NotNull(primaryKey);

        // Assert - Exactly 1 PK property named "Id" of type Guid
        Assert.Single(primaryKey.Properties);
        var pkProperty = primaryKey.Properties[0];
        Assert.Equal("Id", pkProperty.Name);
        Assert.Equal(typeof(Guid), pkProperty.ClrType);
        Assert.Equal(typeof(BaseEntity), pkProperty.PropertyInfo?.DeclaringType);
    }
}
