using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record GetClinicPublicImagesQuery(string Subdomain) : IRequest<ClinicPublicImagesDto>;

public class ClinicPublicImagesDto
{
    public string? LogoUrl { get; set; }
    public string? ClinicImageUrl { get; set; }
    public string? DoctorImageUrl { get; set; }
}

public class GetClinicPublicImagesQueryHandler : IRequestHandler<GetClinicPublicImagesQuery, ClinicPublicImagesDto>
{
    private readonly IUnitOfWork _uow;

    public GetClinicPublicImagesQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ClinicPublicImagesDto> Handle(GetClinicPublicImagesQuery request, CancellationToken cancellationToken)
    {
        var slug = request.Subdomain?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainException("Subdomain is required.");

        var images = await _uow.Tenants.AsQueryable()
            .AsNoTracking()
            .Where(t => t.IsActive && t.Subdomain != null && t.Subdomain.ToLower() == slug)
            .Select(clinic => new ClinicPublicImagesDto
            {
                LogoUrl = clinic.LogoUrl,
                ClinicImageUrl = clinic.ClinicImageUrl,
                DoctorImageUrl = clinic.DoctorImageUrl
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), slug);

        return images;
    }
}
