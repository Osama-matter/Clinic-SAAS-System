using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record UpdateTenantCommand(
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
    bool? IsPublicPageEnabled,
    bool IsActive
) : IRequest<TenantDto>;

public class UpdateTenantCommandHandler : IRequestHandler<UpdateTenantCommand, TenantDto>
{
    private readonly IUnitOfWork _uow;

    public UpdateTenantCommandHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<TenantDto> Handle(UpdateTenantCommand request, CancellationToken cancellationToken)
    {
        var tenant = await _uow.Tenants.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), request.Id);

        tenant.Name = request.Name;
        tenant.Subdomain = request.Subdomain ?? tenant.Subdomain;
        tenant.LogoUrl = request.LogoUrl ?? tenant.LogoUrl;
        tenant.ClinicImageUrl = request.ClinicImageUrl ?? tenant.ClinicImageUrl;
        tenant.Address = request.Address ?? tenant.Address;
        tenant.PhoneNumber = request.PhoneNumber ?? tenant.PhoneNumber;
        tenant.PrimaryColor = request.PrimaryColor ?? tenant.PrimaryColor;
        tenant.DoctorName = request.DoctorName ?? tenant.DoctorName;
        tenant.Specialty = request.Specialty ?? tenant.Specialty;
        tenant.Description = request.Description ?? tenant.Description;
        tenant.DoctorImageUrl = request.DoctorImageUrl ?? tenant.DoctorImageUrl;
        tenant.WorkingHours = request.WorkingHours ?? tenant.WorkingHours;
        tenant.Services = request.Services ?? tenant.Services;
        tenant.IsPublicPageEnabled = request.IsPublicPageEnabled ?? tenant.IsPublicPageEnabled;
        tenant.IsActive = request.IsActive;

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
