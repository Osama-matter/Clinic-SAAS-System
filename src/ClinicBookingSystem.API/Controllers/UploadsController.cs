using ClinicBookingSystem.Application.Constants;
using ClinicBookingSystem.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadsController : ControllerBase
{
    private readonly ITenantProvider _tenantProvider;
    private readonly IFileService _fileService;

    public UploadsController(ITenantProvider tenantProvider, IFileService fileService)
    {
        _tenantProvider = tenantProvider;
        _fileService = fileService;
    }

    [HttpPost("clinic-image")]
    [Authorize(Policy = AppPolicies.AdminOnly)]
    public async Task<IActionResult> UploadClinicImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest("Invalid file type. Only JPG, PNG, and WebP are allowed.");

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest("File size exceeds 5MB limit.");

        var tenantId = _tenantProvider.TenantId;
        if (tenantId == null)
            return Unauthorized("Tenant context not found.");

        using var stream = file.OpenReadStream();
        var imageUrl = await _fileService.SaveFileAsync(stream, file.FileName, "clinics");
        
        return Ok(new { imageUrl });
    }

    [HttpGet("protected/{category}/{fileName}")]
    [Authorize(Policy = AppPolicies.StaffOnly)]
    public async Task<IActionResult> DownloadProtectedFile(string category, string fileName)
    {
        var tenantId = _tenantProvider.TenantId;
        if (!tenantId.HasValue || tenantId == Guid.Empty)
            return Unauthorized("Tenant context is required to access protected files.");

        var (stream, contentType, safeFileName) = await _fileService.GetProtectedFileAsync(tenantId.Value, category, fileName);
        return File(stream, contentType, safeFileName);
    }
}
