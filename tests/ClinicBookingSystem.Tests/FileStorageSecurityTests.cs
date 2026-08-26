using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Moq;
using System.Text;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class FileStorageSecurityTests
{
    private readonly string _testTempDir;
    private readonly Mock<IWebHostEnvironment> _envMock;
    private readonly FileService _fileService;

    public FileStorageSecurityTests()
    {
        _testTempDir = Path.Combine(Path.GetTempPath(), $"ClinicBookingTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testTempDir);

        _envMock = new Mock<IWebHostEnvironment>();
        _envMock.Setup(e => e.WebRootPath).Returns(Path.Combine(_testTempDir, "wwwroot"));
        _envMock.Setup(e => e.ContentRootPath).Returns(_testTempDir);

        _fileService = new FileService(_envMock.Object);
    }

    [Fact]
    public async Task InvalidFileType_PublicUpload_ThrowsDomainException()
    {
        // Attempt to upload an executable or script
        var bytes = Encoding.UTF8.GetBytes("<?php echo 'malicious'; ?>");
        using var stream = new MemoryStream(bytes);

        await Assert.ThrowsAsync<DomainException>(() =>
            _fileService.SaveFileAsync(stream, "exploit.php", "clinics"));

        await Assert.ThrowsAsync<DomainException>(() =>
            _fileService.SaveFileAsync(stream, "trojan.exe", "clinics"));
    }

    [Fact]
    public async Task InvalidFileType_ProtectedUpload_ThrowsDomainException()
    {
        var tenantId = Guid.NewGuid();
        var bytes = Encoding.UTF8.GetBytes("malicious script");
        using var stream = new MemoryStream(bytes);

        await Assert.ThrowsAsync<DomainException>(() =>
            _fileService.SaveProtectedFileAsync(stream, "malicious.js", tenantId, "visits"));
    }

    [Fact]
    public async Task PathTraversal_InFileName_IsSanitizedAndNeutralized()
    {
        var tenantId = Guid.NewGuid();
        var bytes = Encoding.UTF8.GetBytes("%PDF-1.4 test pdf content");
        using var stream = new MemoryStream(bytes);

        // Attempt path traversal via filename
        var savedFileName = await _fileService.SaveProtectedFileAsync(
            stream,
            "../../../../windows/system32/cmd.pdf",
            tenantId,
            "visits"
        );

        // Assert - saved filename must be clean GUID-based name without traversal
        Assert.DoesNotContain("..", savedFileName);
        Assert.EndsWith(".pdf", savedFileName);

        // File must reside inside protected tenant folder
        var (fileStream, contentType, _) = await _fileService.GetProtectedFileAsync(tenantId, "visits", savedFileName);
        Assert.NotNull(fileStream);
        Assert.Equal("application/pdf", contentType);
        fileStream.Dispose();
    }

    [Fact]
    public async Task WrongTenant_ProtectedFileDownload_ThrowsNotFoundException()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var bytes = Encoding.UTF8.GetBytes("%PDF-1.4 medical scan");
        using var stream = new MemoryStream(bytes);

        // Tenant A saves a protected scan
        var fileName = await _fileService.SaveProtectedFileAsync(stream, "scan.pdf", tenantA, "visits");

        // Tenant B attempts to download Tenant A's file
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _fileService.GetProtectedFileAsync(tenantB, "visits", fileName));
    }

    [Fact]
    public async Task PathTraversal_InDownloadRequest_ThrowsNotFoundOrUnauthorized()
    {
        var tenantA = Guid.NewGuid();

        // Attempt path traversal when requesting download
        await Assert.ThrowsAnyAsync<Exception>(() =>
            _fileService.GetProtectedFileAsync(tenantA, "visits", "../../../secret.txt"));
    }

    [Fact]
    public void DeleteFile_WithPathTraversal_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            _fileService.DeleteFile("../../../etc/passwd"));
    }
}
