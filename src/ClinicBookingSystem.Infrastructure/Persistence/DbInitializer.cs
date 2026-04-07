using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using BC = BCrypt.Net.BCrypt;

namespace ClinicBookingSystem.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Seed Tenant
        var defaultTenant = await context.Tenants.FirstOrDefaultAsync(t => t.Name == "Default Clinic");
        if (defaultTenant == null)
        {
            defaultTenant = new Tenant
            {
                Name = "Default Clinic",
                IsActive = true,
                SubscriptionExpiry = DateTime.UtcNow.AddYears(1)
            };
            await context.Tenants.AddAsync(defaultTenant);
            await context.SaveChangesAsync();
        }

        if (!await context.Users.AnyAsync(u => u.Email == "admin@clinic.com"))
        {
            var admin = new User
            {
                Name = "System Admin",
                Email = "admin@clinic.com",
                PasswordHash = BC.HashPassword("Admin123!"),
                Role = UserRole.Admin,
                PhoneNumber = "1234567890",
                TenantId = defaultTenant.Id
            };
            await context.Users.AddAsync(admin);
        }

        if (!await context.Users.AnyAsync(u => u.Email == "staff@clinic.com"))
        {
            var receptionist = new User
            {
                Name = "Main Receptionist",
                Email = "staff@clinic.com",
                PasswordHash = BC.HashPassword("Staff123!"),
                Role = UserRole.Receptionist,
                TenantId = defaultTenant.Id
            };
            await context.Users.AddAsync(receptionist);
        }

        await context.SaveChangesAsync();
        await SeedDrugsAsync(context);
    }

    public static async Task SeedDrugsAsync(ApplicationDbContext context)
    {
        if (await context.Drugs.AnyAsync())
            return;

        var excelPath = Path.Combine(AppContext.BaseDirectory, "External data", "medicines_data_updated.csv.xlsx");
        if (!File.Exists(excelPath))
            return;

        ExcelPackage.License.SetNonCommercialPersonal("ClinicFlow");

        using var package = new ExcelPackage(new FileInfo(excelPath));
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
        if (worksheet?.Dimension == null)
            return;

        var rows = worksheet.Dimension.End.Row;
        var columns = worksheet.Dimension.End.Column;
        var headers = Enumerable.Range(1, columns)
            .ToDictionary(
                col => col,
                col => NormalizeHeader(worksheet.Cells[1, col].Text));

        var imported = new Dictionary<string, Drug>(StringComparer.OrdinalIgnoreCase);

        for (var row = 2; row <= rows; row++)
        {
            var values = Enumerable.Range(1, columns)
                .Select(col => worksheet.Cells[row, col].Text?.Trim() ?? string.Empty)
                .ToArray();

            if (values.All(string.IsNullOrWhiteSpace))
                continue;

            var name = ResolveDrugName(values, headers);
            if (string.IsNullOrWhiteSpace(name))
                continue;

            var form = ResolveDrugForm(values, headers);
            if (!imported.ContainsKey(name))
            {
                imported[name] = new Drug
                {
                    Name = name,
                    Form = form
                };
            }
            else if (string.IsNullOrWhiteSpace(imported[name].Form) && !string.IsNullOrWhiteSpace(form))
            {
                imported[name].Form = form;
            }
        }

        if (imported.Count == 0)
            return;

        await context.Drugs.AddRangeAsync(imported.Values);
        await context.SaveChangesAsync();
    }

    private static string ResolveDrugName(string[] values, Dictionary<int, string> headers)
    {
        var preferredColumn = headers
            .FirstOrDefault(kvp =>
                kvp.Value.Contains("name") ||
                kvp.Value.Contains("drug") ||
                kvp.Value.Contains("medicine") ||
                kvp.Value.Contains("medication") ||
                kvp.Value.Contains("generic"));

        if (preferredColumn.Key > 0)
        {
            var value = values[preferredColumn.Key - 1].Trim();
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;
    }

    private static string ResolveDrugForm(string[] values, Dictionary<int, string> headers)
    {
        var preferredColumn = headers
            .FirstOrDefault(kvp =>
                kvp.Value.Contains("form") ||
                kvp.Value.Contains("dosage") ||
                kvp.Value.Contains("strength") ||
                kvp.Value.Contains("type"));

        if (preferredColumn.Key > 0)
        {
            var value = values[preferredColumn.Key - 1].Trim();
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return values.Skip(1).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;
    }

    private static string NormalizeHeader(string? header)
    {
        if (string.IsNullOrWhiteSpace(header))
            return string.Empty;

        return header.Trim().ToLowerInvariant();
    }
}
