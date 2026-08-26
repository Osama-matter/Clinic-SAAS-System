using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.AspNetCore.Hosting;
using SkiaSharp;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Infrastructure.Services;

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _environment;
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedProtectedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".dcm"];

    private const long MaxPublicImageSize = 5 * 1024 * 1024; // 5MB
    private const long MaxProtectedFileSize = 15 * 1024 * 1024; // 15MB

    public FileService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    private string GetWebRoot()
    {
        return string.IsNullOrEmpty(_environment.WebRootPath)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")
            : _environment.WebRootPath;
    }

    private string GetProtectedStorageRoot()
    {
        var contentRoot = string.IsNullOrEmpty(_environment.ContentRootPath)
            ? Directory.GetCurrentDirectory()
            : _environment.ContentRootPath;
        return Path.GetFullPath(Path.Combine(contentRoot, "App_Data", "protected_uploads"));
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string subDirectory, CancellationToken cancellationToken = default)
    {
        if (fileStream == null) throw new ArgumentNullException(nameof(fileStream));
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("Filename is required.", nameof(fileName));

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            throw new DomainException($"File extension '{extension}' is not allowed for public uploads.");
        }

        var webRoot = GetWebRoot();
        var baseUploadsFolder = Path.GetFullPath(Path.Combine(webRoot, "uploads"));

        // Sanitize subDirectory and fileName against path traversal
        var safeFileName = Path.GetFileName(fileName);
        var safeSubDir = (subDirectory ?? string.Empty).Replace("..", "").Trim('/', '\\');
        var uploadPath = Path.GetFullPath(Path.Combine(baseUploadsFolder, safeSubDir));

        if (!uploadPath.StartsWith(baseUploadsFolder, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid upload path: directory traversal detected.");
        }

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        // Generate unique, non-guessable filename
        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadPath, uniqueFileName);

        await ProcessAndSaveImageAsync(fileStream, filePath, extension, cancellationToken);

        // Return relative URL path
        var relativeUrlDir = string.IsNullOrEmpty(safeSubDir) ? "" : $"/{safeSubDir}";
        return $"/uploads{relativeUrlDir}/{uniqueFileName}";
    }

    public async Task<string> SaveProtectedFileAsync(Stream fileStream, string fileName, Guid tenantId, string category, CancellationToken cancellationToken = default)
    {
        if (fileStream == null) throw new ArgumentNullException(nameof(fileStream));
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("Filename is required.", nameof(fileName));
        if (tenantId == Guid.Empty) throw new ArgumentException("Tenant ID is required for protected storage.", nameof(tenantId));

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedProtectedExtensions.Contains(extension))
        {
            throw new DomainException($"File type '{extension}' is not allowed for protected medical uploads.");
        }

        var protectedRoot = GetProtectedStorageRoot();
        var safeCategory = (category ?? "general").Replace("..", "").Trim('/', '\\');
        var tenantFolder = Path.GetFullPath(Path.Combine(protectedRoot, tenantId.ToString("N"), safeCategory));

        if (!tenantFolder.StartsWith(protectedRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid protected upload path: directory traversal detected.");
        }

        if (!Directory.Exists(tenantFolder))
        {
            Directory.CreateDirectory(tenantFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var destinationPath = Path.Combine(tenantFolder, uniqueFileName);

        if (AllowedImageExtensions.Contains(extension))
        {
            await ProcessAndSaveImageAsync(fileStream, destinationPath, extension, cancellationToken);
        }
        else
        {
            using var destStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None);
            await fileStream.CopyToAsync(destStream, cancellationToken);
        }

        return uniqueFileName;
    }

    public Task<(Stream Stream, string ContentType, string FileName)> GetProtectedFileAsync(Guid tenantId, string category, string fileName, CancellationToken cancellationToken = default)
    {
        if (tenantId == Guid.Empty) throw new UnauthorizedActionException("Invalid tenant context.");
        if (string.IsNullOrWhiteSpace(fileName)) throw new NotFoundException("File", fileName);

        var safeFileName = Path.GetFileName(fileName);
        var safeCategory = (category ?? "general").Replace("..", "").Trim('/', '\\');
        var protectedRoot = GetProtectedStorageRoot();
        var tenantFolder = Path.GetFullPath(Path.Combine(protectedRoot, tenantId.ToString("N"), safeCategory));

        if (!tenantFolder.StartsWith(protectedRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedActionException("Directory traversal attack blocked.");
        }

        var filePath = Path.GetFullPath(Path.Combine(tenantFolder, safeFileName));
        if (!filePath.StartsWith(tenantFolder, StringComparison.OrdinalIgnoreCase) || !File.Exists(filePath))
        {
            throw new NotFoundException("Protected File", safeFileName);
        }

        var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = GetContentType(extension);

        Stream stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult((stream, contentType, safeFileName));
    }

    public void DeleteFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        var webRoot = GetWebRoot();
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

    public void DeleteProtectedFile(Guid tenantId, string category, string fileName)
    {
        if (tenantId == Guid.Empty || string.IsNullOrWhiteSpace(fileName)) return;

        var safeFileName = Path.GetFileName(fileName);
        var safeCategory = (category ?? "general").Replace("..", "").Trim('/', '\\');
        var protectedRoot = GetProtectedStorageRoot();
        var tenantFolder = Path.GetFullPath(Path.Combine(protectedRoot, tenantId.ToString("N"), safeCategory));

        if (!tenantFolder.StartsWith(protectedRoot, StringComparison.OrdinalIgnoreCase)) return;

        var filePath = Path.GetFullPath(Path.Combine(tenantFolder, safeFileName));
        if (filePath.StartsWith(tenantFolder, StringComparison.OrdinalIgnoreCase) && File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }

    private static async Task ProcessAndSaveImageAsync(Stream input, string outputPath, string extension, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await input.CopyToAsync(ms, ct);
        ms.Position = 0;

        using var bitmap = SKBitmap.Decode(ms);
        if (bitmap == null)
        {
            ms.Position = 0;
            using var fs = new FileStream(outputPath, FileMode.Create);
            await ms.CopyToAsync(fs, ct);
            return;
        }

        const int maxWidth = 1600;
        const int maxHeight = 1200;

        var ratio = Math.Min((float)maxWidth / bitmap.Width, (float)maxHeight / bitmap.Height);
        using var finalBitmap = ratio < 1
            ? bitmap.Resize(new SKImageInfo((int)(bitmap.Width * ratio), (int)(bitmap.Height * ratio)), new SKSamplingOptions(SKFilterMode.Linear))
            : bitmap;

        using var image = SKImage.FromBitmap(finalBitmap);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 80);

        using var stream = File.OpenWrite(outputPath);
        data.SaveTo(stream);
    }

    private static string GetContentType(string extension) => extension switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".pdf" => "application/pdf",
        ".dcm" => "application/dicom",
        _ => "application/octet-stream"
    };
}
