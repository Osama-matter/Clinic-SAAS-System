using ClinicBookingSystem.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ClinicBookingSystem.Infrastructure.Persistence;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        
        // Build configuration
        IConfigurationRoot configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("src/ClinicBookingSystem.API/appsettings.json", optional: true)
            .AddJsonFile($"src/ClinicBookingSystem.API/appsettings.{environment}.json", optional: true)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=db47590.public.databaseasp.net; Database=db47590; User Id=db47590; Password=c#3Z@6CbX=a4; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;";

        optionsBuilder.UseSqlServer(connectionString);

        return new ApplicationDbContext(optionsBuilder.Options, new DesignTimeTenantProvider());
    }

    private class DesignTimeTenantProvider : ITenantProvider
    {
        public Guid? TenantId => null;
        public ClinicBookingSystem.Domain.Enums.UserRole? Role => null;
    }
}
