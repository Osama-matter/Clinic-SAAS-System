using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Identity;
using ClinicBookingSystem.Infrastructure.Payments.Fawaterak;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using ClinicBookingSystem.Infrastructure.Services;
using ClinicBookingSystem.Infrastructure.Settings;
using FluentValidation;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

namespace ClinicBookingSystem.API.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(
            typeof(ClinicBookingSystem.Application.Features.Auth.RegisterCommand).Assembly));
        services.AddValidatorsFromAssembly(
            typeof(ClinicBookingSystem.Application.Features.Auth.RegisterCommandValidator).Assembly);
        return services;
    }

    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' is required but was not found.");
        }

        services.AddDbContext<ApplicationDbContext>(opt =>
            opt.UseSqlServer(connectionString));

        services.Configure<JwtOptions>(config.GetSection(JwtOptions.SectionName));
        services.Configure<EmailSettings>(config.GetSection(EmailSettings.SectionName));
        services.Configure<FawaterakOptions>(config.GetSection(FawaterakOptions.SectionName));
        services.Configure<SeedDataOptions>(config.GetSection(SeedDataOptions.SectionName));

        services.AddHttpClient();

        services.AddScoped<TenantProvider>();
        services.AddScoped<ITenantProvider>(sp => sp.GetRequiredService<TenantProvider>());
        services.AddScoped<ICurrentTenant>(sp => sp.GetRequiredService<TenantProvider>());
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IReportExportService, ReportExportService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IPlanService, PlanService>();
        services.AddScoped<ISaaSEnforcementService, SaaSEnforcementService>();
        services.AddScoped<IFawaterakPaymentService, FawaterakPaymentService>();
        services.AddScoped<ISchedulingService, SchedulingService>();
        services.AddScoped<IAppointmentNotificationService, AppointmentNotificationService>();
        services.AddMemoryCache();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(connectionString));
        services.AddHangfireServer();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwtSection = config.GetSection(JwtOptions.SectionName);
        var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();

        // Safe fallback for development initialization if not set
        var secret = string.IsNullOrWhiteSpace(jwtOptions.Secret)
            ? "DEVELOPMENT_INSECURE_SECRET_KEY_REPLACE_IN_PRODUCTION_32_BYTES"
            : jwtOptions.Secret;

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opt =>
            {
                opt.RequireHttpsMetadata = false;
                opt.SaveToken = false;
                opt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    ClockSkew = TimeSpan.Zero,
                    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                    ValidIssuer = string.IsNullOrWhiteSpace(jwtOptions.Issuer) ? "ClinicBookingSystem.API" : jwtOptions.Issuer,
                    ValidAudience = string.IsNullOrWhiteSpace(jwtOptions.Audience) ? "ClinicBookingSystem.Client" : jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                    RoleClaimType = ClaimTypes.Role,
                    NameClaimType = ClaimTypes.NameIdentifier
                };
            });

        services.AddAuthorization(opt =>
        {
            opt.AddPolicy(ClinicBookingSystem.Application.Constants.AppPolicies.SuperAdminOnly, policy =>
                policy.RequireRole(ClinicBookingSystem.Application.Constants.AppRoles.SuperAdmin, "6"));

            opt.AddPolicy(ClinicBookingSystem.Application.Constants.AppPolicies.AdminOnly, policy =>
                policy.RequireRole(ClinicBookingSystem.Application.Constants.AppRoles.Admin, ClinicBookingSystem.Application.Constants.AppRoles.SuperAdmin, "2", "6"));

            opt.AddPolicy(ClinicBookingSystem.Application.Constants.AppPolicies.StaffOnly, policy =>
                policy.RequireRole(ClinicBookingSystem.Application.Constants.AppRoles.Admin, ClinicBookingSystem.Application.Constants.AppRoles.Receptionist, ClinicBookingSystem.Application.Constants.AppRoles.Doctor, ClinicBookingSystem.Application.Constants.AppRoles.SuperAdmin, "2", "3", "4", "6"));

            opt.AddPolicy(ClinicBookingSystem.Application.Constants.AppPolicies.DoctorOnly, policy =>
                policy.RequireRole(ClinicBookingSystem.Application.Constants.AppRoles.Doctor, ClinicBookingSystem.Application.Constants.AppRoles.Admin, ClinicBookingSystem.Application.Constants.AppRoles.SuperAdmin, "4", "2", "6"));

            opt.AddPolicy(ClinicBookingSystem.Application.Constants.AppPolicies.UserOrAdmin, policy =>
                policy.RequireRole(ClinicBookingSystem.Application.Constants.AppRoles.User, ClinicBookingSystem.Application.Constants.AppRoles.Admin, ClinicBookingSystem.Application.Constants.AppRoles.SuperAdmin, "1", "2", "6", "0"));
        });

        return services;
    }

    public static void ValidateSensitiveConfiguration(this IConfiguration config, IHostEnvironment env)
    {
        var jwtSecret = config["Jwt:Secret"];
        var isProduction = env.IsProduction();

        if (isProduction)
        {
            if (string.IsNullOrWhiteSpace(jwtSecret) || 
                jwtSecret.Length < 32 || 
                jwtSecret.Contains("YOUR_SUPER_SECRET_KEY", StringComparison.OrdinalIgnoreCase) ||
                jwtSecret.Contains("DEVELOPMENT_", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY ERROR: Production deployment requires a secure, non-placeholder 'Jwt:Secret' environment variable with at least 32 characters (256 bits).");
            }

            var connectionString = config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY ERROR: ConnectionStrings:DefaultConnection is missing in production.");
            }
        }
    }

    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy("PublicBookingPolicy", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromHours(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));
        });

        return services;
    }

    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Clinic Booking System API",
                Version = "v1",
                Description = "REST API for managing clinic appointments, doctors, schedules, and notifications."
            });
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter your JWT token."
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
                    Array.Empty<string>()
                }
            });
            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
        });

        return services;
    }
}
