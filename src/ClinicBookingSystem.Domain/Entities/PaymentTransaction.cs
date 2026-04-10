using System;
using ClinicBookingSystem.Domain.Enums;

namespace ClinicBookingSystem.Domain.Entities;

public class PaymentTransaction : BaseEntity
{
    public Guid Id { get; set; }
    public Guid SubscriptionId { get; set; }
    public long ExternalInvoiceId { get; set; }
    public string ExternalInvoiceKey { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EGP";
    public string PaymentMethod { get; set; }
    public PaymentStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ClinicSubscription Subscription { get; set; }
}
