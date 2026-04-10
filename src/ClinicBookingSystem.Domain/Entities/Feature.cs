using ClinicBookingSystem.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Domain.Entities
{
    public class Feature : BaseEntity
    {
        public Guid Id { get; set; }

        public string Name { get; set; }
        public string? NameAr { get; set; }

        // مهم جدًا يكون Unique
        public string Code { get; set; } // مثال: "MaxPatients"

        public FeatureType Type { get; set; }

        public string Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<PlanFeature> PlanFeatures { get; set; }
    }
}
