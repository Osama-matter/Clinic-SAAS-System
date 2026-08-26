using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Application.Features.Drugs;

public record DrugDto(Guid Id, string Name, string Form);

public record SearchDrugsQuery(string Query = "", int Take = 15) : IRequest<IEnumerable<DrugDto>>;

public class SearchDrugsQueryHandler : IRequestHandler<SearchDrugsQuery, IEnumerable<DrugDto>>
{
    private readonly IUnitOfWork _uow;

    public SearchDrugsQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IEnumerable<DrugDto>> Handle(SearchDrugsQuery request, CancellationToken cancellationToken)
    {
        var take = Math.Clamp(request.Take, 1, 50);
        var normalizedQuery = (request.Query ?? string.Empty).Trim();

        var (drugs, _) = await _uow.Drugs.GetPagedAsync(
            page: 1,
            pageSize: take,
            predicate: d => !d.IsDeleted && (
                string.IsNullOrWhiteSpace(normalizedQuery) ||
                d.Name.Contains(normalizedQuery) ||
                d.Form.Contains(normalizedQuery)),
            cancellationToken: cancellationToken);

        return drugs.Select(d => new DrugDto(d.Id, d.Name, d.Form));
    }
}
