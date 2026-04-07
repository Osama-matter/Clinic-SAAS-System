using ClinicBookingSystem.Domain.Enums;
using System;
using System.Collections.Generic;

namespace ClinicBookingSystem.Domain.Entities;

public enum GenderType
{
    Male = 1,
    Female = 2,
    Other = 3
}

public enum VisitType
{
    InitialConsultation = 1,
    FollowUp = 2,
    Emergency = 3,
    RoutineCheckup = 4
}

public class Patient : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public GenderType Gender { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string? Allergies { get; set; }
    public string? ChronicDiseases { get; set; }
    public string? DrugHistory { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
}

public class Visit : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public VisitType VisitType { get; set; }
    public DateTime VisitDate { get; set; }
    public string? Symptoms { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    
    public Vitals? Vitals { get; set; }
    public Examination? Examination { get; set; }
    public ICollection<Diagnosis> Diagnoses { get; set; } = new List<Diagnosis>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<LabOrder> LabOrders { get; set; } = new List<LabOrder>();
    public ICollection<ImagingOrder> ImagingOrders { get; set; } = new List<ImagingOrder>();
    public ICollection<Result> Results { get; set; } = new List<Result>();
}

public class Vitals : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? BloodPressure { get; set; }
    public int? HeartRate { get; set; }
    public decimal? Temperature { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public decimal? PO2 { get; set; }
    public decimal? RBS { get; set; }
    public decimal? BMI { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
}

public class Examination : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? GeneralExamination { get; set; }
    public string? LocalExamination { get; set; }
    public string? PhysicalNotes { get; set; }

    // Respiratory
    public string? Resp_Inspection { get; set; }
    public string? Resp_Palpation { get; set; }
    public string? Resp_Percussion { get; set; }
    public string? Resp_Auscultation { get; set; }
    
    // Cardiovascular
    public string? Cvs_Pulse { get; set; }
    public string? Cvs_HeartSounds { get; set; }
    public string? Cvs_Murmurs { get; set; }
    public string? Cvs_Edema { get; set; }

    // Nervous
    public string? Cns_Consciousness { get; set; }
    public string? Cns_MotorPower { get; set; }
    public string? Cns_Sensation { get; set; }
    public string? Cns_Reflexes { get; set; }

    // Gastrointestinal
    public string? Git_Inspection { get; set; }
    public string? Git_Palpation { get; set; }
    public string? Git_Percussion { get; set; }
    public string? Git_Auscultation { get; set; }

    // Musculoskeletal
    public string? Msk_Swelling { get; set; }
    public string? Msk_Tenderness { get; set; }
    public string? Msk_Rom { get; set; }
    public string? Msk_Deformity { get; set; }

    // Skin (Dermatology)
    public string? Skin_Rash { get; set; }
    public string? Skin_Ulcers { get; set; }
    public string? Skin_Pigmentation { get; set; }
    public string? Skin_Infection { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
}

public class Diagnosis : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? ICD10Code { get; set; }
    public string? Description { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
}

public class Drug : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Form { get; set; } = string.Empty;
}

public class Prescription : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? MedicationName { get; set; }
    public string? Dosage { get; set; }
    public string? Instructions { get; set; }
    public string? Duration { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
}

public class LabOrder : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? TestName { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
    public ICollection<Result> Results { get; set; } = new List<Result>();
}

public class ImagingOrder : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    
    public string? ImagingType { get; set; } // e.g., X-Ray, MRI
    public string? BodyPart { get; set; }
    public string? ImageData { get; set; } // Base64 fallback (if needed)
    public string? ImageUrl { get; set; } // Server path/URL
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
    public ICollection<Result> Results { get; set; } = new List<Result>();
}

public class Result : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Guid VisitId { get; set; }
    public Guid? LabOrderId { get; set; }
    public Guid? ImagingOrderId { get; set; }
    
    public string? LabResult { get; set; }
    public string? ImagingResult { get; set; }
    public string? OtherResult { get; set; }
    public string? ImageData { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime ResultDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant? Tenant { get; set; }
    public Visit Visit { get; set; } = null!;
    public LabOrder? LabOrder { get; set; }
    public ImagingOrder? ImagingOrder { get; set; }
}
