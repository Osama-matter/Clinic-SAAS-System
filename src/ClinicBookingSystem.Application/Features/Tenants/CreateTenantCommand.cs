using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record CreateTenantCommand(
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
    bool? IsPublicPageEnabled
) : IRequest<TenantDto>;

public class CreateTenantCommandHandler : IRequestHandler<CreateTenantCommand, TenantDto>
{
    private readonly IUnitOfWork _uow;

    public CreateTenantCommandHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<TenantDto> Handle(CreateTenantCommand request, CancellationToken cancellationToken)
    {
        var tenant = new Tenant
        {
            Name = request.Name,
            Subdomain = request.Subdomain,
            LogoUrl = request.LogoUrl,
            ClinicImageUrl = request.ClinicImageUrl,
            Address = request.Address,
            PhoneNumber = request.PhoneNumber,
            PrimaryColor = request.PrimaryColor,
            DoctorName = request.DoctorName,
            Specialty = request.Specialty,
            Description = request.Description,
            DoctorImageUrl = request.DoctorImageUrl,
            WorkingHours = request.WorkingHours,
            Services = request.Services,
            IsPublicPageEnabled = request.IsPublicPageEnabled ?? true,
            IsActive = true,
            SubscriptionExpiry = DateTime.UtcNow.AddYears(1) // Default 1 year subscription
        };

        await _uow.Tenants.AddAsync(tenant, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.Subdomain,
            tenant.LogoUrl,
            tenant.ClinicImageUrl,
            tenant.Address,
            tenant.PhoneNumber,
            tenant.PrimaryColor,
            tenant.DoctorName,
            tenant.Specialty,
            tenant.Description,
            tenant.DoctorImageUrl,
            tenant.WorkingHours,
            tenant.Services,
            tenant.IsPublicPageEnabled,
            tenant.IsActive);
    }
}
