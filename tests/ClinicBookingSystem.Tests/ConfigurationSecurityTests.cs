using ClinicBookingSystem.API.Extensions;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Infrastructure.Identity;
using ClinicBookingSystem.Infrastructure.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Xunit;

namespace ClinicBookingSystem.Tests;

public class ConfigurationSecurityTests
{
    [Fact]
    public void BaseAppSettings_DoesNotContainHardcodedRealSecrets()
    {
        // Arrange
        var appSettingsPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "ClinicBookingSystem.API", "appsettings.json");
        Assert.True(File.Exists(appSettingsPath), $"appsettings.json not found at {appSettingsPath}");

        var jsonContent = File.ReadAllText(appSettingsPath);
        using var document = JsonDocument.Parse(jsonContent);
        var root = document.RootElement;

        // Assert - Secret placeholders or empty in source control
        var jwtSecret = root.GetProperty("Jwt").GetProperty("Secret").GetString();
        Assert.True(string.IsNullOrEmpty(jwtSecret), "Jwt:Secret in appsettings.json must be empty.");

        var smtpPassword = root.GetProperty("EmailSettings").GetProperty("Password").GetString();
        Assert.True(string.IsNullOrEmpty(smtpPassword), "EmailSettings:Password in appsettings.json must be empty.");

        var fawaterakApiKey = root.GetProperty("Fawaterak").GetProperty("ApiKey").GetString();
        Assert.True(string.IsNullOrEmpty(fawaterakApiKey), "Fawaterak:ApiKey in appsettings.json must be empty.");
    }

    [Fact]
    public void ValidateSensitiveConfiguration_InProduction_ThrowsWhenJwtSecretIsMissingOrPlaceholder()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:DefaultConnection", "Server=prod-db;Database=ClinicSAAS;User Id=sa;Password=secret;" },
            { "Jwt:Secret", "YOUR_SUPER_SECRET_KEY_MINIMUM_32_CHARACTERS_LONG" } // Placeholder
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var mockEnv = new Mock<IHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            config.ValidateSensitiveConfiguration(mockEnv.Object));

        Assert.Contains("CRITICAL SECURITY ERROR", ex.Message);
        Assert.Contains("Jwt:Secret", ex.Message);
    }

    [Fact]
    public void ValidateSensitiveConfiguration_InProduction_ThrowsWhenSecretIsTooShort()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:DefaultConnection", "Server=prod-db;Database=ClinicSAAS;User Id=sa;Password=secret;" },
            { "Jwt:Secret", "short_secret_under_32_chars" }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var mockEnv = new Mock<IHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            config.ValidateSensitiveConfiguration(mockEnv.Object));

        Assert.Contains("CRITICAL SECURITY ERROR", ex.Message);
    }

    [Fact]
    public void ValidateSensitiveConfiguration_InProduction_SucceedsWhenValidProductionSecretsSupplied()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:DefaultConnection", "Server=prod-db;Database=ClinicSAAS;User Id=sa;Password=secret;" },
            { "Jwt:Secret", "A_VERY_SECURE_RANDOM_PRODUCTION_SECRET_KEY_EXCEEDING_32_BYTES_123456" }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var mockEnv = new Mock<IHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        // Act & Assert (should not throw)
        var exception = Record.Exception(() =>
            config.ValidateSensitiveConfiguration(mockEnv.Object));

        Assert.Null(exception);
    }

    [Fact]
    public void ValidateSensitiveConfiguration_InDevelopment_DoesNotThrowForLocalDevFallback()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:DefaultConnection", "Server=localhost;Database=ClinicSAASSystem;Trusted_Connection=True;" },
            { "Jwt:Secret", "" }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var mockEnv = new Mock<IHostEnvironment>();
        mockEnv.Setup(e => e.EnvironmentName).Returns(Environments.Development);

        // Act & Assert (should not throw in development)
        var exception = Record.Exception(() =>
            config.ValidateSensitiveConfiguration(mockEnv.Object));

        Assert.Null(exception);
    }

    [Fact]
    public void TokenService_GeneratesAndValidatesTokensCorrectly_WithOptions()
    {
        // Arrange
        var testSecret = "TEST_SECRET_KEY_FOR_UNIT_TESTING_PURPOSES_MINIMUM_32_CHARACTERS_LONG_123";
        var jwtOptions = Options.Create(new JwtOptions
        {
            Secret = testSecret,
            Issuer = "TestIssuer",
            Audience = "TestAudience"
        });

        var tokenService = new TokenService(jwtOptions);
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        // Act
        var tokenString = tokenService.GenerateAccessToken(userId, "user@test.com", UserRole.Admin, tenantId);

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(tokenString));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(tokenString);

        Assert.Equal("TestIssuer", jwtToken.Issuer);
        Assert.Equal("TestAudience", jwtToken.Audiences.First());
        Assert.Contains(jwtToken.Claims, c => c.Type == "TenantId" && c.Value == tenantId.ToString());
        Assert.Contains(jwtToken.Claims, c => c.Type == "role" && c.Value == "Admin");
    }
}
