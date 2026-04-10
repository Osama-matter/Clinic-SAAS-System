using System;

namespace ClinicBookingSystem.Domain.Entities;

public class PendingOnboarding : BaseEntity
{
    public string Subdomain { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string OnboardingDataJson { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
