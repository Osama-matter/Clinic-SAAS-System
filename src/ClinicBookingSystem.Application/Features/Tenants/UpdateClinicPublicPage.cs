using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Application.Interfaces;
using MediatR;
using Newtonsoft.Json;
using System.IO;
using System;
using System.Threading;
using System.Threading.Tasks;

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
    private readonly IFileService _fileService;

    public UpdateClinicPublicPageCommandHandler(
        IUnitOfWork uow,
        ClinicBookingSystem.Application.Interfaces.ITenantProvider tenantProvider,
        IFileService fileService)
    {
        _uow = uow;
        _tenantProvider = tenantProvider;
        _fileService = fileService;
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
        
        // Save images, decoding Base64 if present
        tenant.LogoUrl = await ProcessBase64ImageAsync(request.LogoUrl, cancellationToken);
        tenant.ClinicImageUrl = await ProcessBase64ImageAsync(request.ClinicImageUrl, cancellationToken);
        tenant.DoctorImageUrl = await ProcessBase64ImageAsync(request.DoctorImageUrl, cancellationToken);
        
        tenant.Address = request.Address;
        tenant.PhoneNumber = request.PhoneNumber;
        tenant.PrimaryColor = request.PrimaryColor;
        tenant.DoctorName = request.DoctorName;
        tenant.Specialty = request.Specialty;
        tenant.Description = request.Description;
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

    private async Task<string?> ProcessBase64ImageAsync(string? base64String, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(base64String) || !base64String.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            return base64String;

        try
        {
            var parts = base64String.Split(',');
            if (parts.Length < 2) return base64String;

            var header = parts[0];
            var base64Data = parts[1];

            var extension = "png";
            if (header.Contains("image/jpeg") || header.Contains("image/jpg"))
                extension = "jpg";
            else if (header.Contains("image/webp"))
                extension = "webp";
            else if (header.Contains("image/gif"))
                extension = "gif";

            var bytes = Convert.FromBase64String(base64Data);
            using var stream = new MemoryStream(bytes);

            var fileName = $"uploaded_image.{extension}";
            var relativeUrl = await _fileService.SaveFileAsync(stream, fileName, "clinics", cancellationToken);
            return relativeUrl;
        }
        catch
        {
            return base64String; // fallback to base64 if it fails, so we don't break/crash
        }
    }
}
