using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record GetTenantsQuery : IRequest<IEnumerable<TenantDto>>;

public class GetTenantsQueryHandler : IRequestHandler<GetTenantsQuery, IEnumerable<TenantDto>>
{
    private readonly IUnitOfWork _uow;

    public GetTenantsQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IEnumerable<TenantDto>> Handle(GetTenantsQuery request, CancellationToken cancellationToken)
    {
        var tenants = await _uow.Tenants.GetAllAsync(
            t => t.IsActive && !t.IsDeleted,
            cancellationToken);

        return tenants.Select(t => new TenantDto(t.Id, t.Name, t.Subdomain, t.LogoUrl, t.ClinicImageUrl, t.Address, t.PhoneNumber));
    }
}
