using ClinicBookingSystem.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using SkiaSharp;
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
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("Filename is required.", nameof(fileName));

        var webRoot = string.IsNullOrEmpty(_environment.WebRootPath)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")
            : _environment.WebRootPath;

        var baseUploadsFolder = Path.GetFullPath(Path.Combine(webRoot, "uploads"));

        // Sanitize subDirectory and fileName against path traversal
        var safeFileName = Path.GetFileName(fileName);
        var safeSubDir = (subDirectory ?? string.Empty).Replace("..", "").Trim('/', '\\');
        var uploadPath = Path.GetFullPath(Path.Combine(baseUploadsFolder, safeSubDir));

        if (!uploadPath.StartsWith(baseUploadsFolder, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid upload path directory traversal detected.");
        }

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        // Generate unique filename
        var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";
        var filePath = Path.Combine(uploadPath, uniqueFileName);

        // Process image if it's an image
        var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
        var imageExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

        if (imageExtensions.Contains(extension))
        {
            await ProcessAndSaveImageAsync(fileStream, filePath, extension, cancellationToken);
        }
        else
        {
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(stream, cancellationToken);
            }
        }

        // Return relative URL path
        var relativeUrlDir = string.IsNullOrEmpty(safeSubDir) ? "" : $"/{safeSubDir}";
        return $"/uploads{relativeUrlDir}/{uniqueFileName}";
    }

    private async Task ProcessAndSaveImageAsync(Stream input, string outputPath, string extension, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await input.CopyToAsync(ms, ct);
        ms.Position = 0;

        using var bitmap = SKBitmap.Decode(ms);
        if (bitmap == null)
        {
            // Fallback if decoding fails
            ms.Position = 0;
            using var fs = new FileStream(outputPath, FileMode.Create);
            await ms.CopyToAsync(fs, ct);
            return;
        }

        // Standard size for clinic/doctor images
        int maxWidth = 1200;
        int maxHeight = 800;

        float ratio = Math.Min((float)maxWidth / bitmap.Width, (float)maxHeight / bitmap.Height);
        
        using var finalBitmap = ratio < 1 
            ? bitmap.Resize(new SKImageInfo((int)(bitmap.Width * ratio), (int)(bitmap.Height * ratio)), SKFilterQuality.Medium)
            : bitmap;

        using var image = SKImage.FromBitmap(finalBitmap);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 75); // 75% quality for good balance
        
        using var stream = File.OpenWrite(outputPath);
        data.SaveTo(stream);
    }

    public void DeleteFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        var webRoot = string.IsNullOrEmpty(_environment.WebRootPath)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")
            : _environment.WebRootPath;

        var baseWebRoot = Path.GetFullPath(webRoot);
        var relativePath = filePath.TrimStart('/', '\\');
        var physicalPath = Path.GetFullPath(Path.Combine(baseWebRoot, relativePath));

        if (!physicalPath.StartsWith(baseWebRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid file path directory traversal detected.");
        }

        if (File.Exists(physicalPath))
        {
            File.Delete(physicalPath);
        }
    }
}
