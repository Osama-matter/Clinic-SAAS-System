using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Interfaces;
using ClinicBookingSystem.Infrastructure.Identity;
using ClinicBookingSystem.Infrastructure.Persistence;
using ClinicBookingSystem.Infrastructure.Persistence.Repositories;
using ClinicBookingSystem.Infrastructure.Settings;
using ClinicBookingSystem.Infrastructure.Payments.Fawaterak;
using ClinicBookingSystem.Infrastructure.Services;
using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using FluentValidation;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
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
        services.AddDbContext<ApplicationDbContext>(opt =>
            opt.UseSqlServer(config.GetConnectionString("DefaultConnection")));
        services.Configure<EmailSettings>(config.GetSection("EmailSettings"));
        services.Configure<FawaterakOptions>(config.GetSection("Fawaterak"));

        services.AddHttpClient();


        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITenantProvider, TenantProvider>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IReportExportService, ReportExportService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IPlanService, PlanService>();
        services.AddScoped<ISaaSEnforcementService, SaaSEnforcementService>();
        services.AddScoped<IFawaterakPaymentService, FawaterakPaymentService>();
        services.AddMemoryCache();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(config.GetConnectionString("DefaultConnection")));
        services.AddHangfireServer();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        // Don't clear maps yet, let's be explicit in the validation parameters
        // System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opt =>
            {
                opt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = config["Jwt:Issuer"],
                    ValidAudience = config["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(config["Jwt:Secret"]!)),
                    RoleClaimType = ClaimTypes.Role, // Use standard Microsoft Role claim
                    NameClaimType = ClaimTypes.NameIdentifier
                };
            });

        services.AddAuthorization(opt =>
        {
            opt.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "2"));
            opt.AddPolicy("UserOrAdmin", policy => policy.RequireRole("User", "Admin", "1", "2", "0"));
            opt.AddPolicy("DoctorOnly", policy => policy.RequireRole("Doctor", "4", "Admin", "2", "Receptionist", "3"));
            opt.AddPolicy("StaffOnly", policy => policy.RequireRole("Admin", "Receptionist", "Doctor", "2", "3", "4"));
        });

        return services;
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
