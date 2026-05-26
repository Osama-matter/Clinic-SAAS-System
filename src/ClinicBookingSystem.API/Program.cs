using ClinicBookingSystem.API.Extensions;
using ClinicBookingSystem.API.Middleware;
using ClinicBookingSystem.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──────────────────────────────────────────
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/eams-.txt", rollingInterval: RollingInterval.Day));

// ── Services ─────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerWithJwt();
builder.Services.AddRateLimiting();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Allow any origin in development
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();
var runStartupTasks = builder.Configuration.GetValue<bool>("RunStartupTasks");

// ── Middleware ────────────────────────────────────────
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Clinic Booking System API v1"));

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
});
app.MapControllers();

// ── Hangfire Dashboard ────────────────────────────────
app.UseHangfireDashboard("/hangfire");

// ── Startup Tasks (Migrate, Seed, Hangfire Jobs) ───────
if (runStartupTasks)
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        Log.Information("Starting startup tasks...");
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<ApplicationDbContext>();
            
            // Auto Migrate
            Log.Information("Checking migrations...");
            var pendingMigrations = await db.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                Log.Information("Applying {Count} pending migrations...", pendingMigrations.Count());
                await db.Database.MigrateAsync();
            }
            else
            {
                Log.Information("Database is up to date.");
            }
            
            // Seed Data
            Log.Information("Seeding database check...");
            var env = services.GetRequiredService<IWebHostEnvironment>();
            var webRoot = env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
            await ClinicBookingSystem.Infrastructure.Persistence.DbInitializer.SeedAsync(db, webRoot);
            
            // Recurring Jobs
            Log.Information("Registering recurring jobs...");
            var recurringJobManager = services.GetRequiredService<IRecurringJobManager>();
            
            recurringJobManager.AddOrUpdate<ClinicBookingSystem.Infrastructure.Services.Background.ReminderJob>(
                "send-reminders",
                job => job.SendRemindersAsync(),
                "*/15 * * * *"); // Every 15 minutes

            recurringJobManager.AddOrUpdate<ClinicBookingSystem.Infrastructure.Services.Background.FeedbackJob>(
                "send-feedback-requests",
                job => job.SendFeedbackRequestsAsync(),
                "0 * * * *"); // Every hour

            recurringJobManager.AddOrUpdate<ClinicBookingSystem.Infrastructure.Services.Background.AppointmentCleanupJob>(
                "cleanup-expired-appointments",
                job => job.CleanupExpiredAppointmentsAsync(),
                "0 * * * *"); // Every hour
        }
        sw.Stop();
        Log.Information("Startup tasks completed successfully in {ElapsedMs}ms.", sw.ElapsedMilliseconds);
    }
    catch (Exception ex)
    {
        sw.Stop();
        Log.Error(ex, "Critical error during startup tasks after {ElapsedMs}ms.", sw.ElapsedMilliseconds);
        throw;
    }
}
else
{
    Log.Information("Skipping startup tasks because RunStartupTasks is disabled.");
}

app.Run();
