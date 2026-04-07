namespace ClinicBookingSystem.Application.Features.Tenants;

public record TenantDto(
    Guid Id,
    string Name,
    string? Subdomain,
    string? LogoUrl,
    string? ClinicImageUrl,
    string? Address,
    string? PhoneNumber
);
