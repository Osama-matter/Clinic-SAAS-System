namespace ClinicBookingSystem.Application.Features.Tenants;

public record TenantDto(
    Guid Id,
    string Name,
    string? Subdomain,
    string? LogoUrl,
    string? ClinicImageUrl,
    string? Address,
    string? PhoneNumber,
    string? PrimaryColor,
    string? DoctorName,
    string? Specialty,
    string? Description,
    string? DoctorImageUrl,
    string? WorkingHours,
    string? Services,
    bool IsPublicPageEnabled,
    bool IsActive
);
