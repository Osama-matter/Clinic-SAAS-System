using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;


namespace ClinicBookingSystem.Application.Features.Tenants;

public record GetTenantsSummaryQuery : IRequest<IEnumerable<TenantSummaryDto>>;

public class GetTenantsSummaryQueryHandler : IRequestHandler<GetTenantsSummaryQuery, IEnumerable<TenantSummaryDto>>
{
    private readonly IUnitOfWork _uow;

    public GetTenantsSummaryQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IEnumerable<TenantSummaryDto>> Handle(GetTenantsSummaryQuery request, CancellationToken cancellationToken)
    {
        return await _uow.Tenants.AsQueryable()
            .Where(t => t.IsActive && !t.IsDeleted)
            .Select(t => new TenantSummaryDto(
                t.Id,
                t.Name,
                t.Subdomain,
                t.LogoUrl,
                t.IsActive))
            .ToListAsync(cancellationToken);
    }
}
