using ClinicBookingSystem.Application.Features.Doctors;
using ClinicBookingSystem.Application.Features.Tenants;
using ClinicBookingSystem.Application.Features.Visits;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace ClinicBookingSystem.Tests;

public class PerformanceAuditTests
{
    private readonly ITestOutputHelper _output;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly string _dbName = $"PerfDb_{Guid.NewGuid():N}";

    public PerformanceAuditTests(ITestOutputHelper output)
    {
        _output = output;
    }

    private (ApplicationDbContext Db, IUnitOfWork Uow, ITenantProvider TenantProvider, ICurrentUserService CurrentUser) CreateContext()
    {
        var tenantProviderMock = new Mock<ITenantProvider>();
        tenantProviderMock.Setup(t => t.TenantId).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Id).Returns(_tenantId);
        tenantProviderMock.Setup(t => t.Role).Returns(UserRole.Admin);
        tenantProviderMock.Setup(t => t.IsSuperAdmin).Returns(false);

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(c => c.TenantId).Returns(_tenantId);
        currentUserMock.Setup(c => c.UserId).Returns(Guid.NewGuid());
        currentUserMock.Setup(c => c.Role).Returns("Admin");
        currentUserMock.Setup(c => c.IsAuthenticated).Returns(true);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: _dbName)
            .Options;

        var db = new ApplicationDbContext(options, tenantProviderMock.Object);
        var uow = new UnitOfWork(db);

        // Seed Plan & Active Subscription
        var plan = new Plan { Name = "Perf Plan", Price = 100, DurationDays = 365, MaxDoctors = 100, MaxPatients = 10000, MaxBookings = 100000, IsActive = true };
        db.Plans.Add(plan);
        db.ClinicSubscriptions.Add(new ClinicSubscription { ClinicId = _tenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartDate = DateTime.UtcNow.AddDays(-1), ExpiresAt = DateTime.UtcNow.AddYears(1) });
        db.SaveChanges();

        return (db, uow, tenantProviderMock.Object, currentUserMock.Object);
    }

    [Fact]
    public async Task Benchmark_GetTenantsSummary_OptimizedProjectionPerformance()
    {
        var (db, uow, _, _) = CreateContext();

        // Seed 100 clinics
        for (int i = 0; i < 100; i++)
        {
            db.Tenants.Add(new Tenant
            {
                Name = $"Clinic {i}",
                Subdomain = $"clinic{i}",
                Description = new string('X', 1000), // Large payload field that summary avoids loading
                Services = new string('Y', 2000),
                IsActive = true
            });
        }
        await db.SaveChangesAsync();

        var handler = new GetTenantsSummaryQueryHandler(uow);

        // Measure
        var sw = Stopwatch.StartNew();
        var summaries = (await handler.Handle(new GetTenantsSummaryQuery(), CancellationToken.None)).ToList();
        sw.Stop();

        _output.WriteLine($"GetTenantsSummary: {summaries.Count} rows processed in {sw.ElapsedMilliseconds} ms ({sw.ElapsedTicks} ticks)");

        Assert.Equal(100, summaries.Count);
        Assert.True(sw.ElapsedMilliseconds < 500, "Query should complete under 500ms");
    }

    [Fact]
    public async Task Benchmark_GetAvailableSlots_MultiSourceJoinEfficiency()
    {
        var (db, uow, _, _) = CreateContext();

        var doctor = new Doctor { TenantId = _tenantId, Name = "Dr. Benchmark", Specialty = "Cardiology", UserId = Guid.NewGuid(), IsActive = true };
        db.Doctors.Add(doctor);

        var date = DateTime.UtcNow.Date.AddDays(1);

        db.Schedules.Add(new Schedule
        {
            TenantId = _tenantId,
            DoctorId = doctor.Id,
            DayOfWeek = date.DayOfWeek,
            StartTime = TimeSpan.FromHours(9),
            EndTime = TimeSpan.FromHours(17),
            SlotDurationMinutes = 30
        });

        for (int i = 0; i < 5; i++)
        {
            db.Appointments.Add(PatientAppointment.Create(_tenantId, doctor.Id, Guid.NewGuid(), date.AddHours(10 + i), "Test Appt"));
        }
        await db.SaveChangesAsync();

        var handler = new GetAvailableSlotsQueryHandler(uow);

        // Measure
        var sw = Stopwatch.StartNew();
        var slots = (await handler.Handle(new GetAvailableSlotsQuery(doctor.Id, date), CancellationToken.None)).ToList();
        sw.Stop();

        _output.WriteLine($"GetAvailableSlots: {slots.Count} slots calculated in {sw.ElapsedMilliseconds} ms ({sw.ElapsedTicks} ticks)");

        Assert.Equal(16, slots.Count);
        Assert.Equal(5, slots.Count(s => !s.IsAvailable));
        Assert.True(sw.ElapsedMilliseconds < 500, "Slot calculation should complete under 500ms");
    }

    [Fact]
    public async Task Benchmark_GetVisitsByPatient_PagedNoTrackingPerformance()
    {
        var (db, uow, _, currentUser) = CreateContext();
        var patientId = Guid.NewGuid();

        for (int i = 0; i < 50; i++)
        {
            db.Visits.Add(new Visit
            {
                TenantId = _tenantId,
                PatientId = patientId,
                DoctorId = Guid.NewGuid(),
                VisitType = VisitType.InitialConsultation,
                VisitDate = DateTime.UtcNow.AddDays(-i),
                Symptoms = $"Symptom {i}",
                Notes = $"Notes {i}"
            });
        }
        await db.SaveChangesAsync();

        var fileServiceMock = new Mock<IFileService>();
        var handler = new VisitHandlers(uow, fileServiceMock.Object, currentUser);

        // Measure
        var sw = Stopwatch.StartNew();
        var result = await handler.Handle(new GetVisitsByPatientQuery(patientId, 1, 10), CancellationToken.None);
        sw.Stop();

        _output.WriteLine($"GetVisitsByPatient (Paged 10/50): Retrieved in {sw.ElapsedMilliseconds} ms");

        Assert.Equal(50, result.TotalCount);
        Assert.Equal(10, result.Items.Count());
        Assert.True(sw.ElapsedMilliseconds < 500, "Paged queries should complete under 500ms");
    }
}
