using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using System.Linq.Expressions;

namespace ClinicBookingSystem.Application.Features.Patients;

public record GetAllPatientsQuery(int Page = 1, int PageSize = 20, string? Search = null) : IRequest<PagedPatientsResultDto>;

public class GetAllPatientsQueryHandler : IRequestHandler<GetAllPatientsQuery, PagedPatientsResultDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetAllPatientsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<PagedPatientsResultDto> Handle(GetAllPatientsQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var search = request.Search?.Trim().ToLowerInvariant();

        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        var tenantId = _currentUser.TenantId;

        if (!isSuperAdmin && !tenantId.HasValue)
            throw new DomainException("Tenant ID is required.");

        Expression<Func<Patient, bool>> predicate = p =>
            (isSuperAdmin || (tenantId.HasValue && p.TenantId == tenantId.Value)) &&
            (string.IsNullOrWhiteSpace(search) || p.Name.ToLower().Contains(search) || p.Phone.Contains(search));

        var (items, totalCount) = await _uow.Patients.GetPagedAsync(page, pageSize, predicate, cancellationToken);
        
        var dtos = items.Select(p => new PatientDto(
            p.Id,
            p.TenantId ?? Guid.Empty,
            p.Name,
            p.Phone,
            p.Gender,
            p.DateOfBirth,
            p.Allergies,
            p.ChronicDiseases,
            p.DrugHistory
        ));

        return new PagedPatientsResultDto(dtos, totalCount, page, pageSize);
    }
}
