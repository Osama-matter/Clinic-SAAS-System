using ClinicBookingSystem.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Infrastructure.Services;

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _environment;

    public FileService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string subDirectory, CancellationToken cancellationToken = default)
    {
        if (fileStream == null) throw new ArgumentNullException(nameof(fileStream));

        // Create directory if not exists
        var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", subDirectory);
        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        // Generate unique filename
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var filePath = Path.Combine(uploadPath, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream, cancellationToken);
        }

        // Return relative URL path
        return $"/uploads/{subDirectory}/{uniqueFileName}";
    }

    public void DeleteFile(string filePath)
    {
        if (string.IsNullOrEmpty(filePath)) return;

        // Convert relative URL to physical path
        var relativePath = filePath.TrimStart('/');
        var physicalPath = Path.Combine(_environment.WebRootPath, relativePath);

        if (File.Exists(physicalPath))
        {
            File.Delete(physicalPath);
        }
    }
}
