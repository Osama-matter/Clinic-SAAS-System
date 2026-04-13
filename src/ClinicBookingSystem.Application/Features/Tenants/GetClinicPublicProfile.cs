using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace ClinicBookingSystem.Application.Features.Tenants;

public record GetClinicPublicProfileQuery(string Subdomain) : IRequest<ClinicPublicProfileDto>;

public class ClinicPublicProfileDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Subdomain { get; set; }
    public string? DoctorName { get; set; }
    public string? Specialty { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? ClinicImageUrl { get; set; }
    public string? DoctorImageUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? WorkingHours { get; set; }
    public List<string> Services { get; set; } = new();
    public bool IsActive { get; set; }
    public bool IsPublicPageEnabled { get; set; }
}

public class GetClinicPublicProfileQueryHandler : IRequestHandler<GetClinicPublicProfileQuery, ClinicPublicProfileDto>
{
    private readonly IUnitOfWork _uow;

    public GetClinicPublicProfileQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ClinicPublicProfileDto> Handle(GetClinicPublicProfileQuery request, CancellationToken cancellationToken)
    {
        var slug = request.Subdomain?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainException("Subdomain is required.");

        var clinicDto = await _uow.Tenants.AsQueryable()
            .AsNoTracking()
            .Where(t => t.IsActive && t.IsPublicPageEnabled && t.Subdomain != null && t.Subdomain.ToLower() == slug)
            .Select(clinic => new ClinicPublicProfileDto
            {
                Id = clinic.Id,
                Name = clinic.Name,
                Subdomain = clinic.Subdomain,
                DoctorName = clinic.DoctorName,
                Specialty = clinic.Specialty,
                Description = clinic.Description,
                // Images are now loaded separately for performance
                LogoUrl = null,
                ClinicImageUrl = null,
                DoctorImageUrl = null,
                PrimaryColor = clinic.PrimaryColor,
                PhoneNumber = clinic.PhoneNumber,
                Address = clinic.Address,
                WorkingHours = clinic.WorkingHours,
                Services = ParseServices(clinic.Services),
                IsActive = clinic.IsActive,
                IsPublicPageEnabled = clinic.IsPublicPageEnabled
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(Tenant), slug);

        return clinicDto;
    }

    private static List<string> ParseServices(string? servicesJson)
    {
        if (string.IsNullOrWhiteSpace(servicesJson))
            return new List<string>();

        try
        {
            return JsonConvert.DeserializeObject<List<string>>(servicesJson) ?? new List<string>();
        }
        catch
        {
            return servicesJson
                .Split(new[] { '\n', '\r', ',' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
        }
    }
}
