namespace ClinicBookingSystem.Application.Features.Tenants;

public record TenantSummaryDto(
    Guid Id,
    string Name,
    string? Subdomain,
    string? LogoUrl,
    bool IsActive
);
