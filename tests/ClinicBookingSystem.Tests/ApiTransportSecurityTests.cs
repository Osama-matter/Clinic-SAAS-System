using ClinicBookingSystem.API.Middleware;
using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class ApiTransportSecurityTests
{
    private (HttpContext Context, MemoryStream ResponseBody) CreateMockHttpContext()
    {
        var context = new DefaultHttpContext();
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;
        return (context, responseBody);
    }

    [Fact]
    public async Task ExceptionHandlingMiddleware_InProduction_HidesInternalServerErrorDetails()
    {
        // Arrange - Production environment
        var envMock = new Mock<IHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>();
        var (context, responseBody) = CreateMockHttpContext();

        var middleware = new ExceptionHandlingMiddleware(
            next: (innerCtx) => throw new System.Data.SqlTypes.SqlNullValueException("Sensitive SQL Server internal connection details: db_user=sa, server=10.0.0.5"),
            logger: loggerMock.Object,
            environment: envMock.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal(500, context.Response.StatusCode);

        responseBody.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(responseBody);
        var json = await reader.ReadToEndAsync();
        var doc = JsonDocument.Parse(json);
        var detail = doc.RootElement.GetProperty("detail").GetString();

        // Must NOT leak internal SQL or connection string details
        Assert.DoesNotContain("SQL Server", detail);
        Assert.DoesNotContain("10.0.0.5", detail);
        Assert.Equal("An unexpected error occurred while processing your request. Please contact support.", detail);
    }

    [Fact]
    public async Task ExceptionHandlingMiddleware_KnownBusinessExceptions_ReturnSafeDetailInProduction()
    {
        // Arrange
        var envMock = new Mock<IHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>();
        var (context, responseBody) = CreateMockHttpContext();

        var middleware = new ExceptionHandlingMiddleware(
            next: (innerCtx) => throw new DomainException("Doctor is not available at the selected time."),
            logger: loggerMock.Object,
            environment: envMock.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal(400, context.Response.StatusCode);

        responseBody.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(responseBody);
        var json = await reader.ReadToEndAsync();
        var doc = JsonDocument.Parse(json);
        var detail = doc.RootElement.GetProperty("detail").GetString();

        Assert.Equal("Doctor is not available at the selected time.", detail);
    }
}
