using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Newtonsoft.Json;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record UpdateClinicPublicPageCommand(
    string? Name,
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
    IEnumerable<string>? Services,
    bool IsPublicPageEnabled
) : IRequest<TenantDto>;

public class UpdateClinicPublicPageCommandHandler : IRequestHandler<UpdateClinicPublicPageCommand, TenantDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ClinicBookingSystem.Application.Interfaces.ITenantProvider _tenantProvider;

    public UpdateClinicPublicPageCommandHandler(
        IUnitOfWork uow,
        ClinicBookingSystem.Application.Interfaces.ITenantProvider tenantProvider)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
    }

    public async Task<TenantDto> Handle(UpdateClinicPublicPageCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.TenantId
            ?? throw new DomainException("Tenant context is required.");

        var tenant = await _uow.Tenants.GetByIdAsync(tenantId, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), tenantId);

        if (!string.IsNullOrWhiteSpace(request.Name))
            tenant.Name = request.Name.Trim();

        tenant.Subdomain = request.Subdomain?.Trim().ToLowerInvariant();
        tenant.LogoUrl = request.LogoUrl;
        tenant.ClinicImageUrl = request.ClinicImageUrl;
        tenant.Address = request.Address;
        tenant.PhoneNumber = request.PhoneNumber;
        tenant.PrimaryColor = request.PrimaryColor;
        tenant.DoctorName = request.DoctorName;
        tenant.Specialty = request.Specialty;
        tenant.Description = request.Description;
        tenant.DoctorImageUrl = request.DoctorImageUrl;
        tenant.WorkingHours = request.WorkingHours;
        tenant.Services = request.Services == null ? null : JsonConvert.SerializeObject(request.Services.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList());
        tenant.IsPublicPageEnabled = request.IsPublicPageEnabled;

        await _uow.Tenants.UpdateAsync(tenant, cancellationToken);
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
