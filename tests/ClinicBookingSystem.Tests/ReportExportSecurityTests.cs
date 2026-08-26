using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Text;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class ReportExportSecurityTests
{
    private (ApplicationDbContext DbContext, Mock<ITenantProvider> TenantProviderMock, ReportExportService ReportService) CreateReportServiceContext(
        Guid? tenantId,
        UserRole? role = UserRole.Admin,
        bool isSuperAdmin = false,
        string? dbName = null)
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(role);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(isSuperAdmin);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? $"ReportExportSecDb_{Guid.NewGuid()}")
            .Options;

        var dbContext = new ApplicationDbContext(options, tenantProviderMock.Object);
        var reportService = new ReportExportService(dbContext);

        return (dbContext, tenantProviderMock, reportService);
    }

    [Fact]
    public async Task Test1_TenantA_CannotExport_TenantB_Patients()
    {
        // Arrange
        var dbName = $"ReportDb_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed data using SuperAdmin context
        var (seedContext, _, _) = CreateReportServiceContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);

        var userA = new User
        {
            TenantId = tenantA,
            Name = "Alice In Tenant A",
            Email = "alice.tenanta@example.com",
            PhoneNumber = "01011111111",
            Role = UserRole.User,
            PasswordHash = "hash1"
        };

        var userB = new User
        {
            TenantId = tenantB,
            Name = "Bob In Tenant B",
            Email = "bob.tenantb@example.com",
            PhoneNumber = "01022222222",
            Role = UserRole.User,
            PasswordHash = "hash2"
        };

        await seedContext.Users.AddRangeAsync(userA, userB);
        await seedContext.SaveChangesAsync();

        // Act - Authenticated as Tenant A Admin
        var (_, _, reportServiceTenantA) = CreateReportServiceContext(tenantId: tenantA, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var pdfBytes = await reportServiceTenantA.ExportAppointmentsPdfAsync(null, null);
        var pdfText = Encoding.UTF8.GetString(pdfBytes);

        // Assert - Tenant A user must be present; Tenant B user must NEVER be present
        Assert.Contains("Alice In Tenant A", pdfText);
        Assert.Contains("alice.tenanta@example.com", pdfText);
        Assert.Contains("01011111111", pdfText);

        Assert.DoesNotContain("Bob In Tenant B", pdfText);
        Assert.DoesNotContain("bob.tenantb@example.com", pdfText);
        Assert.DoesNotContain("01022222222", pdfText);
    }

    [Fact]
    public async Task Test2_MultipleTenants_OnlyExports_AuthenticatedTenant_Patients()
    {
        // Arrange
        var dbName = $"ReportDb_Multi_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenantC = Guid.NewGuid();

        var (seedContext, _, _) = CreateReportServiceContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);

        var userA1 = new User { TenantId = tenantA, Name = "Patient A1", Email = "a1@clinic.com", PhoneNumber = "111", Role = UserRole.Patient, PasswordHash = "h" };
        var userA2 = new User { TenantId = tenantA, Name = "Patient A2", Email = "a2@clinic.com", PhoneNumber = "112", Role = UserRole.Patient, PasswordHash = "h" };

        var userB1 = new User { TenantId = tenantB, Name = "Patient B1", Email = "b1@clinic.com", PhoneNumber = "221", Role = UserRole.Patient, PasswordHash = "h" };
        var userB2 = new User { TenantId = tenantB, Name = "Patient B2", Email = "b2@clinic.com", PhoneNumber = "222", Role = UserRole.Patient, PasswordHash = "h" };

        var userC1 = new User { TenantId = tenantC, Name = "Patient C1", Email = "c1@clinic.com", PhoneNumber = "331", Role = UserRole.Patient, PasswordHash = "h" };

        await seedContext.Users.AddRangeAsync(userA1, userA2, userB1, userB2, userC1);
        await seedContext.SaveChangesAsync();

        // Act - Authenticate as Tenant B
        var (_, _, reportServiceTenantB) = CreateReportServiceContext(tenantId: tenantB, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var pdfBytes = await reportServiceTenantB.ExportAppointmentsPdfAsync(null, null);
        var pdfText = Encoding.UTF8.GetString(pdfBytes);

        // Assert - Only Tenant B patients exist
        Assert.Contains("Patient B1", pdfText);
        Assert.Contains("b1@clinic.com", pdfText);
        Assert.Contains("Patient B2", pdfText);
        Assert.Contains("b2@clinic.com", pdfText);

        Assert.DoesNotContain("Patient A1", pdfText);
        Assert.DoesNotContain("Patient A2", pdfText);
        Assert.DoesNotContain("Patient C1", pdfText);
    }

    [Fact]
    public async Task Test3_TenantIsolation_WithIdenticalPatientData_EnforcesTenantBoundary()
    {
        // Arrange
        var dbName = $"ReportDb_Colliding_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedContext, _, _) = CreateReportServiceContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);

        // Identical names, emails, and phones registered in different tenants
        var userInA = new User { TenantId = tenantA, Name = "John Smith", Email = "john.smith@gmail.com", PhoneNumber = "01000009999", Role = UserRole.User, PasswordHash = "h" };
        var userInB = new User { TenantId = tenantB, Name = "John Smith", Email = "john.smith@gmail.com", PhoneNumber = "01000009999", Role = UserRole.User, PasswordHash = "h" };

        await seedContext.Users.AddRangeAsync(userInA, userInB);
        await seedContext.SaveChangesAsync();

        // Act - Export as Tenant A
        var (contextA, _, reportServiceTenantA) = CreateReportServiceContext(tenantId: tenantA, role: UserRole.Admin, isSuperAdmin: false, dbName: dbName);
        var pdfBytes = await reportServiceTenantA.ExportAppointmentsPdfAsync(null, null);
        var pdfText = Encoding.UTF8.GetString(pdfBytes);

        // Assert - The text should contain "John Smith", but the underlying context query must have executed with tenant filtering
        Assert.Contains("John Smith", pdfText);

        // Verify count of matching records in the generated PDF registry
        var occurrences = (pdfText.Length - pdfText.Replace("john.smith@gmail.com", "").Length) / "john.smith@gmail.com".Length;
        Assert.Equal(1, occurrences);
    }

    [Fact]
    public async Task Test4_MissingTenantContext_FailsClosedWithUnauthorizedActionException()
    {
        // Arrange
        var dbName = $"ReportDb_NoTenant_{Guid.NewGuid()}";
        var (_, _, unauthenticatedReportService) = CreateReportServiceContext(
            tenantId: null,
            role: UserRole.Admin,
            isSuperAdmin: false,
            dbName: dbName);

        // Act & Assert - Calling PDF export without tenant context must fail closed
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            unauthenticatedReportService.ExportAppointmentsPdfAsync(null, null));

        // Act & Assert - Calling CSV export without tenant context must fail closed
        await Assert.ThrowsAsync<UnauthorizedActionException>(() =>
            unauthenticatedReportService.ExportAppointmentsCsvAsync(null, null));
    }

    [Fact]
    public async Task Test5_SuperAdmin_CanExportCrossTenant_OrTargetSpecificTenant()
    {
        // Arrange
        var dbName = $"ReportDb_SuperAdmin_{Guid.NewGuid()}";
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var (seedContext, _, _) = CreateReportServiceContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);

        var userA = new User { TenantId = tenantA, Name = "Alice SuperAdminTest", Email = "alice.super@example.com", PhoneNumber = "111", Role = UserRole.User, PasswordHash = "h" };
        var userB = new User { TenantId = tenantB, Name = "Bob SuperAdminTest", Email = "bob.super@example.com", PhoneNumber = "222", Role = UserRole.User, PasswordHash = "h" };

        await seedContext.Users.AddRangeAsync(userA, userB);
        await seedContext.SaveChangesAsync();

        // Act - SuperAdmin global query (no tenant constraint)
        var (_, _, superAdminReportService) = CreateReportServiceContext(tenantId: null, role: UserRole.SuperAdmin, isSuperAdmin: true, dbName: dbName);
        var pdfBytes = await superAdminReportService.ExportAppointmentsPdfAsync(null, null);
        var pdfText = Encoding.UTF8.GetString(pdfBytes);

        // Assert - SuperAdmin global export contains both
        Assert.Contains("Alice SuperAdminTest", pdfText);
        Assert.Contains("Bob SuperAdminTest", pdfText);
    }
}
