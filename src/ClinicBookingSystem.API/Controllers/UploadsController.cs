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

    public UploadsController(IWebHostEnvironment environment, ITenantProvider tenantProvider)
    {
        _environment = environment;
        _tenantProvider = tenantProvider;
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

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "clinics");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{tenantId}_{DateTime.UtcNow.Ticks}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var imageUrl = $"/uploads/clinics/{fileName}";
        return Ok(new { imageUrl });
    }
}
