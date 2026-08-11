using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Application.Interfaces;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);
    Task SendBookingConfirmationAsync(string to, string doctorName, DateTime slotDate, CancellationToken cancellationToken = default);
    Task SendReminderAsync(string to, string title, DateTime date, CancellationToken cancellationToken = default);
}

public interface ISmsService
{
    Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}

public interface ITokenService
{
    string GenerateAccessToken(Guid userId, string email, UserRole role, Guid tenantId);
    string GenerateRefreshToken();
    string HashRefreshToken(string token);
    bool ValidateRefreshToken(string token, string storedHash);
}

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    Guid? TenantId { get; }
    bool IsAuthenticated { get; }
}


public interface IReportExportService
{
    Task<byte[]> ExportAppointmentsCsvAsync(DateTime? from, DateTime? to, Guid? doctorId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportAppointmentsPdfAsync(DateTime? from, DateTime? to, Guid? doctorId = null, CancellationToken cancellationToken = default);
}

public interface IFileService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string subDirectory, CancellationToken cancellationToken = default);
    void DeleteFile(string filePath);
}

public interface IPlanService
{
    Task<bool> IsSubscriptionActiveAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<bool> CheckLimitAsync(Guid tenantId, string featureCode, CancellationToken cancellationToken = default);
}

