using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Domain.Entities
{
    public class Plan : BaseEntity
    {
        public Guid Id { get; set; }

        public string Name { get; set; }

        public decimal Price { get; set; }
        public int DurationDays { get; set; }
        public int? MaxDoctors { get; set; }
        public int? MaxPatients { get; set; }
        public int? MaxBookings { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<ClinicSubscription> ClinicSubscriptions { get; set; }
        public ICollection<PlanFeature> PlanFeatures { get; set; }
    }
}
