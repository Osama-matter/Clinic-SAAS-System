using MediatR;
using ClinicBookingSystem.Domain.Enums;
using System;
using System.Collections.Generic;

namespace ClinicBookingSystem.Application.Features.SaaSAdmin;

public record SaasDashboardStatsDto(
    int TotalClinics,
    int ActiveSubscriptions,
    decimal TotalRevenue,
    decimal MonthlyRecurringRevenue,
    int NewClinicsThisMonth,
    int ExpiringSoonCount
);

public record RevenuePointDto(
    string Period, // e.g., "Oct 2023"
    decimal Revenue
);

public record SaasTransactionDto(
    Guid Id,
    string ClinicName,
    decimal Amount,
    string Currency,
    string PaymentMethod,
    PaymentStatus Status,
    DateTime CreatedAt,
    string PaymentRef
);

public record ClinicUsageDto(
    Guid ClinicId,
    string ClinicName,
    string PlanName,
    int DoctorCount,
    int? MaxDoctors,
    int PatientCount,
    int? MaxPatients,
    int AppointmentCount,
    int? MaxBookings,
    SubscriptionStatus Status,
    DateTime ExpiresAt
);

public record GetSaasDashboardStatsQuery() : IRequest<SaasDashboardStatsDto>;
public record GetSaasRevenueAnalyticsQuery() : IRequest<IEnumerable<RevenuePointDto>>;
public record GetSaasTransactionsQuery(int Page = 1, int PageSize = 20) : IRequest<IEnumerable<SaasTransactionDto>>;
public record GetClinicsUsageMetricsQuery() : IRequest<IEnumerable<ClinicUsageDto>>;

public record UpdateClinicSubscriptionCommand(
    Guid SubscriptionId,
    Guid PlanId,
    SubscriptionStatus Status,
    DateTime ExpiresAt
) : IRequest<bool>;

public record ManualCreateClinicCommand(
    string ClinicName,
    string Subdomain,
    string Address,
    string Phone,
    Guid PlanId,
    string AdminName,
    string AdminEmail,
    string AdminPassword
) : IRequest<Guid>;
