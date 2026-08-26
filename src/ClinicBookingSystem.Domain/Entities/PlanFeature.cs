using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Domain.Entities
{
    public class PlanFeature : BaseEntity
    {
        public Guid PlanId { get; set; }
        public Guid FeatureId { get; set; }

        // للـ Boolean Features
        public bool? IsEnabled { get; set; }

        // للـ Limits زي MaxPatients
        public int? LimitValue { get; set; }

        // Navigation
        public Plan Plan { get; set; }
        public Feature Feature { get; set; }
    }
}
