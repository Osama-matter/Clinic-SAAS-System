using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClinicBookingSystem.Application.Interfaces;

namespace ClinicBookingSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly ITenantProvider _tenantProvider;
    private readonly IFileService _fileService;

    public UploadsController(IWebHostEnvironment environment, ITenantProvider tenantProvider, IFileService fileService)
    {
        _environment = environment;
        _tenantProvider = tenantProvider;
        _fileService = fileService;
    }

    [HttpPost("clinic-image")]
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
}
