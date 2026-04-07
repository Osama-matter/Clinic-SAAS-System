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
        tenant.Subdomain = request.Subdomain;
        tenant.LogoUrl = request.LogoUrl;
        tenant.ClinicImageUrl = request.ClinicImageUrl;
        tenant.Address = request.Address;
        tenant.PhoneNumber = request.PhoneNumber;
        tenant.IsActive = request.IsActive;

        await _uow.Tenants.UpdateAsync(tenant, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new TenantDto(tenant.Id, tenant.Name, tenant.Subdomain, tenant.LogoUrl, tenant.ClinicImageUrl, tenant.Address, tenant.PhoneNumber);
    }
}
