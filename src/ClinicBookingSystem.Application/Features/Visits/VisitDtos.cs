using ClinicBookingSystem.Domain.Entities;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Visits;

// ── DTOs ──────────────────────────────────────────────
public record VisitSummaryDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    VisitType VisitType,
    DateTime VisitDate,
    string? Symptoms,
    string? Notes,
    IEnumerable<DiagnosisDto>? Diagnoses = null,
    IEnumerable<PrescriptionDto>? Prescriptions = null,
    IEnumerable<ImagingOrderDto>? ImagingOrders = null
);

public record VisitDetailDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    VisitType VisitType,
    DateTime VisitDate,
    string? Symptoms,
    string? Notes,
    VitalsDto? Vitals,
    ExaminationDto? Examination,
    IEnumerable<DiagnosisDto> Diagnoses,
    IEnumerable<PrescriptionDto> Prescriptions,
    IEnumerable<LabOrderDto> LabOrders,
    IEnumerable<ImagingOrderDto> ImagingOrders,
    IEnumerable<ResultDto> Results
);

public record VitalsDto {
    public string? BloodPressure { get; init; }
    public int? HeartRate { get; init; }
    public decimal? Temperature { get; init; }
    public decimal? Weight { get; init; }
    public decimal? Height { get; init; }
    public decimal? PO2 { get; init; }
    public decimal? RBS { get; init; }
    public decimal? BMI { get; init; }

    public VitalsDto() { }
    public VitalsDto(string? bp, int? hr, decimal? temp, decimal? w, decimal? h, decimal? po2, decimal? rbs, decimal? bmi) {
        BloodPressure = bp; HeartRate = hr; Temperature = temp; Weight = w; Height = h; PO2 = po2; RBS = rbs; BMI = bmi;
    }
}

public record ExaminationDto {
    public string? GeneralExamination { get; init; }
    public string? LocalExamination { get; init; }
    public string? PhysicalNotes { get; init; }

    // Respiratory
    public string? Resp_Inspection { get; init; }
    public string? Resp_Palpation { get; init; }
    public string? Resp_Percussion { get; init; }
    public string? Resp_Auscultation { get; init; }
    
    // Cardiovascular
    public string? Cvs_Pulse { get; init; }
    public string? Cvs_HeartSounds { get; init; }
    public string? Cvs_Murmurs { get; init; }
    public string? Cvs_Edema { get; init; }

    // Nervous
    public string? Cns_Consciousness { get; init; }
    public string? Cns_MotorPower { get; init; }
    public string? Cns_Sensation { get; init; }
    public string? Cns_Reflexes { get; init; }

    // Gastrointestinal
    public string? Git_Inspection { get; init; }
    public string? Git_Palpation { get; init; }
    public string? Git_Percussion { get; init; }
    public string? Git_Auscultation { get; init; }

    // Musculoskeletal
    public string? Msk_Swelling { get; init; }
    public string? Msk_Tenderness { get; init; }
    public string? Msk_Rom { get; init; }
    public string? Msk_Deformity { get; init; }

    // Skin (Dermatology)
    public string? Skin_Rash { get; init; }
    public string? Skin_Ulcers { get; init; }
    public string? Skin_Pigmentation { get; init; }
    public string? Skin_Infection { get; init; }

    public ExaminationDto() { }
    public ExaminationDto(string? gen, string? loc, string? phys) {
        GeneralExamination = gen; LocalExamination = loc; PhysicalNotes = phys;
    }
}

public record DiagnosisDto {
    public Guid? Id { get; init; }
    public string? ICD10Code { get; init; }
    public string? Description { get; init; }

    public DiagnosisDto() { }
    public DiagnosisDto(Guid? id, string? code, string? desc) {
        Id = id; ICD10Code = code; Description = desc;
    }
}

public record PrescriptionDto {
    public Guid? Id { get; init; }
    public string? MedicationName { get; init; }
    public string? Dosage { get; init; }
    public string? Instructions { get; init; }
    public string? Duration { get; init; }

    public PrescriptionDto() { }
    public PrescriptionDto(Guid? id, string? name, string? dose, string? inst, string? dur) {
        Id = id; MedicationName = name; Dosage = dose; Instructions = inst; Duration = dur;
    }
}

public record LabOrderDto {
    public Guid? Id { get; init; }
    public string? TestName { get; init; }
    public DateTime? OrderDate { get; init; }

    public LabOrderDto() { }
    public LabOrderDto(Guid? id, string? name, DateTime? date) {
        Id = id; TestName = name; OrderDate = date;
    }
}

public record ImagingOrderDto {
    public Guid? Id { get; init; }
    public string? ImagingType { get; init; }
    public string? BodyPart { get; init; }
    public string? ImageData { get; init; }
    public string? ImageUrl { get; init; }
    public DateTime? OrderDate { get; init; }

    public ImagingOrderDto() { }
    public ImagingOrderDto(Guid? id, string? type, string? part, string? imageData, string? imageUrl, DateTime? date) {
        Id = id; ImagingType = type; BodyPart = part; ImageData = imageData; ImageUrl = imageUrl; OrderDate = date;
    }
}

public record ResultDto {
    public Guid? Id { get; init; }
    public string? LabResult { get; init; }
    public string? ImagingResult { get; init; }
    public string? OtherResult { get; init; }
    public string? ImageData { get; init; }
    public string? ImageUrl { get; init; }
    public DateTime? ResultDate { get; init; }

    public ResultDto() { }
    public ResultDto(Guid? id, string? lab, string? img, string? other, string? imageData, string? imageUrl, DateTime? date) {
        Id = id; LabResult = lab; ImagingResult = img; OtherResult = other; ImageData = imageData; ImageUrl = imageUrl; ResultDate = date;
    }
}

// ── Commands ──────────────────────────────────────────
public record CreateVisitCommand(
    Guid PatientId,
    Guid DoctorId,
    VisitType VisitType,
    DateTime VisitDate,
    string? Symptoms,
    string? Notes
) : IRequest<VisitSummaryDto>;

public record CreateComprehensiveVisitCommand(
    Guid PatientId,
    Guid DoctorId,
    VisitType VisitType,
    DateTime VisitDate,
    string? Symptoms,
    string? Notes,
    VitalsDto? Vitals,
    ExaminationDto? Examination,
    IEnumerable<DiagnosisDto>? Diagnoses,
    IEnumerable<PrescriptionDto>? Prescriptions,
    IEnumerable<LabOrderDto>? LabOrders,
    IEnumerable<ImagingOrderDto>? ImagingOrders,
    IEnumerable<ResultDto>? Results
) : IRequest<VisitDetailDto>;

public record UpdateComprehensiveVisitCommand(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    VisitType VisitType,
    DateTime VisitDate,
    string? Symptoms,
    string? Notes,
    VitalsDto? Vitals,
    ExaminationDto? Examination,
    IEnumerable<DiagnosisDto>? Diagnoses,
    IEnumerable<PrescriptionDto>? Prescriptions,
    IEnumerable<LabOrderDto>? LabOrders,
    IEnumerable<ImagingOrderDto>? ImagingOrders,
    IEnumerable<ResultDto>? Results
) : IRequest<VisitDetailDto>;

public record DeleteVisitCommand(Guid Id) : IRequest<Unit>;


public record AddVitalsCommand(
    Guid VisitId,
    string? BloodPressure,
    int? HeartRate,
    decimal? Temperature,
    decimal? Weight,
    decimal? Height,
    decimal? PO2,
    decimal? RBS
) : IRequest<Unit>;

public record AddPrescriptionCommand(
    Guid VisitId,
    string MedicationName,
    string Dosage,
    string Instructions,
    string Duration
) : IRequest<Unit>;

public record AddDiagnosisCommand(
    Guid VisitId,
    string? ICD10Code,
    string Description
) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetVisitByIdQuery(Guid Id) : IRequest<VisitDetailDto>;

public record PagedVisitsResultDto(
    IEnumerable<VisitSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public record GetVisitsByPatientQuery(Guid PatientId, int Page = 1, int PageSize = 20) : IRequest<PagedVisitsResultDto>;
