using ClinicBookingSystem.API.Middleware;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class SecurityLoggingAndAuditTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly string _sharedDbName = $"AuditLogDb_{Guid.NewGuid():N}";

    private ApplicationDbContext CreateDbContext()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Admin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _sharedDbName)
            .Options;

        return new ApplicationDbContext(options, tenantProviderMock.Object);
    }

    [Fact]
    public async Task AuditLog_AutomaticallyRecords_SensitiveEntityMutations()
    {
        using var db = CreateDbContext();

        var plan = new Plan { Name = "Audit Plan", Price = 50, DurationDays = 365, MaxDoctors = 10, MaxPatients = 100, MaxBookings = 1000, IsActive = true };
        db.Plans.Add(plan);
        db.ClinicSubscriptions.Add(new ClinicSubscription { ClinicId = _tenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddDays(365) });

        var user = new User
        {
            TenantId = _tenantId,
            Name = "Audited User",
            Email = "audited.user@test.com",
            PasswordHash = "SuperSecretHash123",
            Role = UserRole.Doctor
        };
        db.Users.Add(user);

        // Act - Save changes
        await db.SaveChangesAsync();

        // Assert - Verified AuditLog was recorded
        var auditLogs = await db.AuditLogs.ToListAsync();
        Assert.NotEmpty(auditLogs);

        var userLog = auditLogs.FirstOrDefault(l => l.EntityName == "User");
        Assert.NotNull(userLog);
        Assert.Equal("Added", userLog.Action);
        Assert.Contains("Admin", userLog.PerformedBy);
    }

    [Fact]
    public async Task ExceptionHandlingMiddleware_SecurityEvent_AttachesTraceIdToProblemDetails()
    {
        var envMock = new Mock<IHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>();
        var context = new DefaultHttpContext();
        context.TraceIdentifier = "TRACE-SEC-12345678";
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        var middleware = new ExceptionHandlingMiddleware(
            next: (innerCtx) => throw new UnauthorizedActionException("Forbidden cross-tenant operation"),
            logger: loggerMock.Object,
            environment: envMock.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal(403, context.Response.StatusCode);

        responseBody.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(responseBody);
        var json = await reader.ReadToEndAsync();
        var doc = JsonDocument.Parse(json);

        Assert.True(doc.RootElement.TryGetProperty("traceId", out var traceIdProp));
        Assert.Equal("TRACE-SEC-12345678", traceIdProp.GetString());
    }
}
