using ClinicBookingSystem.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Domain.Entities
{
    
    public class ClinicSubscription : BaseEntity
    {
        public Guid ClinicId { get; set; }
        public Guid PlanId { get; set; }

        public SubscriptionStatus Status { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime ExpiresAt { get; set; }

        public decimal PaidAmount { get; set; }
        public string? PaymentRef { get; set; }

        // Navigation
        public Tenant Clinic { get; set; } = null!;
        public Plan Plan { get; set; } = null!;
        public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
    }
}
