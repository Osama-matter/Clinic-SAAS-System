using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Application.Features.SaaSAdmin;

public class SaaSAdminDashboardHandlers : 
    IRequestHandler<GetSaasDashboardStatsQuery, SaasDashboardStatsDto>,
    IRequestHandler<GetSaasRevenueAnalyticsQuery, IEnumerable<RevenuePointDto>>,
    IRequestHandler<GetClinicsUsageMetricsQuery, IEnumerable<ClinicUsageDto>>,
    IRequestHandler<GetSaasTransactionsQuery, IEnumerable<SaasTransactionDto>>,
    IRequestHandler<UpdateClinicSubscriptionCommand, bool>
{
    private readonly IUnitOfWork _uow;

    public SaaSAdminDashboardHandlers(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<SaasDashboardStatsDto> Handle(GetSaasDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var firstDayOfMonth = new DateTime(now.Year, now.Month, 1);

        // Optimize: Use DB-side math for stats
        var subQuery = _uow.ClinicSubscriptions.AsQueryable().AsNoTracking();

        var totalRevenue = await subQuery.SumAsync(s => s.PaidAmount, cancellationToken);
        
        var activeSubs = await subQuery
            .Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial)
            .Include(s => s.Plan)
            .ToListAsync(cancellationToken);

        // MRR Calculation on simplified list
        var mrr = activeSubs.Where(s => s.Plan != null && s.Plan.DurationDays > 0)
                            .Sum(s => s.PaidAmount / s.Plan.DurationDays * 30);

        var totalClinics = await _uow.Tenants.CountAsync(t => !t.IsDeleted, cancellationToken);
        var newClinics = await _uow.Tenants.CountAsync(t => !t.IsDeleted && t.CreatedAt >= firstDayOfMonth, cancellationToken);
        
        var expiringSoon = await subQuery
            .CountAsync(s => s.Status == SubscriptionStatus.Active && s.ExpiresAt > now && s.ExpiresAt <= now.AddDays(7), cancellationToken);

        return new SaasDashboardStatsDto(
            totalClinics,
            activeSubs.Count,
            totalRevenue,
            mrr,
            newClinics,
            expiringSoon
        );
    }

    public async Task<IEnumerable<RevenuePointDto>> Handle(GetSaasRevenueAnalyticsQuery request, CancellationToken cancellationToken)
    {
        // Optimize: GroupBy in DB
        var results = await _uow.ClinicSubscriptions.AsQueryable()
            .AsNoTracking()
            .GroupBy(s => new { s.CreatedAt.Year, s.CreatedAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Revenue = g.Sum(s => s.PaidAmount)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);

        return results.Select(r => new RevenuePointDto(
            $"{new DateTime(r.Year, r.Month, 1):MMM yyyy}",
            r.Revenue
        )).ToList();
    }

    public async Task<IEnumerable<ClinicUsageDto>> Handle(GetClinicsUsageMetricsQuery request, CancellationToken cancellationToken)
    {
        // SOLUTION TO N+1: FETCH ALL METRICS IN ONE QUERY
        // We use .Select() to project only necessary data and counts
        var metrics = await _uow.Tenants.AsQueryable()
            .AsNoTracking()
            .Where(t => !t.IsDeleted)
            .Select(clinic => new
            {
                clinic.Id,
                clinic.Name,
                // Get most recent subscription info
                LatestSub = clinic.Subscriptions
                    .OrderByDescending(s => s.CreatedAt)
                    .Select(s => new { 
                        s.Status, 
                        s.ExpiresAt, 
                        PlanName = s.Plan != null ? s.Plan.Name : "No Plan",
                        MaxDoctors = s.Plan != null ? (int?)s.Plan.MaxDoctors : null,
                        MaxPatients = s.Plan != null ? (int?)s.Plan.MaxPatients : null,
                        MaxBookings = s.Plan != null ? (int?)s.Plan.MaxBookings : null
                    })
                    .FirstOrDefault(),
                // Aggregates computed in SQL
                DoctorCount = clinic.Doctors.Count(d => !d.IsDeleted),
                PatientCount = _uow.Patients.AsQueryable().Count(p => !p.IsDeleted && p.TenantId == clinic.Id),
                ApptCount = _uow.Appointments.AsQueryable().Count(a => !a.IsDeleted && a.TenantId == clinic.Id)
            })
            .ToListAsync(cancellationToken);

        return metrics.Select(m => new ClinicUsageDto(
            m.Id,
            m.Name,
            m.LatestSub?.PlanName ?? "No Plan",
            m.DoctorCount,
            m.LatestSub?.MaxDoctors,
            m.PatientCount,
            m.LatestSub?.MaxPatients,
            m.ApptCount,
            m.LatestSub?.MaxBookings,
            m.LatestSub?.Status ?? SubscriptionStatus.Inactive,
            m.LatestSub?.ExpiresAt ?? DateTime.MinValue
        )).ToList();
    }

    public async Task<IEnumerable<SaasTransactionDto>> Handle(GetSaasTransactionsQuery request, CancellationToken cancellationToken)
    {
        var transactions = await _uow.PaymentTransactions.AsQueryable()
            .AsNoTracking()
            .Include(t => t.Subscription)
            .ThenInclude(s => s.Clinic)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return transactions.Select(t => new SaasTransactionDto(
            t.Id,
            t.Subscription?.Clinic?.Name ?? "Unknown",
            t.Amount,
            t.Currency,
            t.PaymentMethod,
            t.Status,
            t.CreatedAt,
            t.ExternalInvoiceKey ?? "N/A"
        ));
    }

    public async Task<bool> Handle(UpdateClinicSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var subscription = await _uow.ClinicSubscriptions.GetByIdAsync(request.SubscriptionId, cancellationToken)
            ?? throw new NotFoundException(nameof(ClinicSubscription), request.SubscriptionId);

        subscription.PlanId = request.PlanId;
        subscription.Status = request.Status;
        subscription.ExpiresAt = request.ExpiresAt;
        subscription.UpdatedAt = DateTime.UtcNow;

        await _uow.ClinicSubscriptions.UpdateAsync(subscription, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return true;
    }
}
