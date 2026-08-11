using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Visits;
public record UploadVisitImageCommand(Stream FileStream, string FileName) : IRequest<string>;

public class VisitHandlers : 
    IRequestHandler<CreateVisitCommand, VisitSummaryDto>,
    IRequestHandler<CreateComprehensiveVisitCommand, VisitDetailDto>,
    IRequestHandler<UpdateComprehensiveVisitCommand, VisitDetailDto>,
    IRequestHandler<DeleteVisitCommand, Unit>,
    IRequestHandler<AddVitalsCommand, Unit>,
    IRequestHandler<AddPrescriptionCommand, Unit>,
    IRequestHandler<AddDiagnosisCommand, Unit>,
    IRequestHandler<UploadVisitImageCommand, string>,
    IRequestHandler<GetVisitByIdQuery, VisitDetailDto>,
    IRequestHandler<GetVisitsByPatientQuery, PagedVisitsResultDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IFileService _fileService;
    private readonly ICurrentUserService _currentUser;

    public VisitHandlers(IUnitOfWork uow, IFileService fileService, ICurrentUserService currentUser)
    {
        _uow = uow;
        _fileService = fileService;
        _currentUser = currentUser;
    }

    public async Task<VisitSummaryDto> Handle(CreateVisitCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _currentUser.TenantId
            ?? throw new DomainException("Tenant ID is required.");

        var visit = new Visit
        {
            TenantId = tenantId,
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            VisitType = request.VisitType,
            VisitDate = request.VisitDate,
            Symptoms = request.Symptoms,
            Notes = request.Notes
        };

        await _uow.Visits.AddAsync(visit, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return new VisitSummaryDto(visit.Id, visit.PatientId, visit.DoctorId, visit.VisitType, visit.VisitDate, visit.Symptoms, visit.Notes);
    }

    public async Task<VisitDetailDto> Handle(CreateComprehensiveVisitCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _currentUser.TenantId
            ?? throw new DomainException("Tenant ID is required.");

        var visit = new Visit
        {
            TenantId = tenantId,
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            VisitType = request.VisitType,
            VisitDate = request.VisitDate,
            Symptoms = request.Symptoms,
            Notes = request.Notes
        };
        await _uow.Visits.AddAsync(visit, cancellationToken);
        
        if (request.Vitals != null) {
            await _uow.Vitals.AddAsync(new Vitals {
                Visit = visit,
                BloodPressure = request.Vitals.BloodPressure,
                HeartRate = request.Vitals.HeartRate,
                Temperature = request.Vitals.Temperature,
                Weight = request.Vitals.Weight,
                Height = request.Vitals.Height,
                PO2 = request.Vitals.PO2,
                RBS = request.Vitals.RBS,
                BMI = request.Vitals.BMI
            }, cancellationToken);
        }
        
        if (request.Examination != null) {
            await _uow.Examinations.AddAsync(new Examination {
                Visit = visit,
                GeneralExamination = request.Examination.GeneralExamination,
                LocalExamination = request.Examination.LocalExamination,
                PhysicalNotes = request.Examination.PhysicalNotes,

                // Respiratory
                Resp_Inspection = request.Examination.Resp_Inspection,
                Resp_Palpation = request.Examination.Resp_Palpation,
                Resp_Percussion = request.Examination.Resp_Percussion,
                Resp_Auscultation = request.Examination.Resp_Auscultation,

                // Cardiovascular
                Cvs_Pulse = request.Examination.Cvs_Pulse,
                Cvs_HeartSounds = request.Examination.Cvs_HeartSounds,
                Cvs_Murmurs = request.Examination.Cvs_Murmurs,
                Cvs_Edema = request.Examination.Cvs_Edema,

                // Nervous
                Cns_Consciousness = request.Examination.Cns_Consciousness,
                Cns_MotorPower = request.Examination.Cns_MotorPower,
                Cns_Sensation = request.Examination.Cns_Sensation,
                Cns_Reflexes = request.Examination.Cns_Reflexes,

                // Gastrointestinal
                Git_Inspection = request.Examination.Git_Inspection,
                Git_Palpation = request.Examination.Git_Palpation,
                Git_Percussion = request.Examination.Git_Percussion,
                Git_Auscultation = request.Examination.Git_Auscultation,

                // Musculoskeletal
                Msk_Swelling = request.Examination.Msk_Swelling,
                Msk_Tenderness = request.Examination.Msk_Tenderness,
                Msk_Rom = request.Examination.Msk_Rom,
                Msk_Deformity = request.Examination.Msk_Deformity,

                // Skin
                Skin_Rash = request.Examination.Skin_Rash,
                Skin_Ulcers = request.Examination.Skin_Ulcers,
                Skin_Pigmentation = request.Examination.Skin_Pigmentation,
                Skin_Infection = request.Examination.Skin_Infection
            }, cancellationToken);
        }

        if (request.Diagnoses != null && request.Diagnoses.Any()) {
            foreach (var d in request.Diagnoses) {
                await _uow.Diagnoses.AddAsync(new Diagnosis { Visit = visit, ICD10Code = d.ICD10Code, Description = d.Description }, cancellationToken);
            }
        }

        if (request.Prescriptions != null && request.Prescriptions.Any()) {
            foreach (var p in request.Prescriptions) {
                await _uow.Prescriptions.AddAsync(new Prescription { Visit = visit, MedicationName = p.MedicationName, Dosage = p.Dosage, Instructions = p.Instructions, Duration = p.Duration }, cancellationToken);
            }
        }
        
        if (request.LabOrders != null && request.LabOrders.Any()) {
            foreach (var l in request.LabOrders) {
                await _uow.LabOrders.AddAsync(new LabOrder { Visit = visit, TestName = l.TestName, OrderDate = l.OrderDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        if (request.ImagingOrders != null && request.ImagingOrders.Any()) {
            foreach (var i in request.ImagingOrders) {
                await _uow.ImagingOrders.AddAsync(new ImagingOrder { Visit = visit, ImagingType = i.ImagingType, BodyPart = i.BodyPart, ImageData = i.ImageData, ImageUrl = i.ImageUrl, OrderDate = i.OrderDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        if (request.Results != null && request.Results.Any()) {
            foreach (var r in request.Results) {
                await _uow.Results.AddAsync(new Result { Visit = visit, LabResult = r.LabResult, ImagingResult = r.ImagingResult, OtherResult = r.OtherResult, ImageData = r.ImageData, ImageUrl = r.ImageUrl, ResultDate = r.ResultDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        await _uow.SaveChangesAsync(cancellationToken);
        return await Handle(new GetVisitByIdQuery(visit.Id), cancellationToken);
    }

    public async Task<VisitDetailDto> Handle(UpdateComprehensiveVisitCommand request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.Id, cancellationToken, 
            v => v.Vitals, v => v.Examination, v => v.Diagnoses, v => v.Prescriptions,
            v => v.LabOrders, v => v.ImagingOrders, v => v.Results) 
            ?? throw new NotFoundException(nameof(Visit), request.Id);

        // Update scalar properties
        visit.DoctorId = request.DoctorId;
        visit.VisitType = request.VisitType;
        visit.VisitDate = request.VisitDate;
        visit.Symptoms = request.Symptoms;
        visit.Notes = request.Notes;

        // Map Vitals
        if (request.Vitals == null && visit.Vitals != null) {
            visit.Vitals.BloodPressure = null;
            visit.Vitals.HeartRate = null;
            visit.Vitals.Temperature = null;
            visit.Vitals.Weight = null;
            visit.Vitals.Height = null;
            visit.Vitals.PO2 = null;
            visit.Vitals.RBS = null;
            visit.Vitals.BMI = null;
        } else if (request.Vitals != null) {
            if (visit.Vitals == null) {
                visit.Vitals = new Vitals { VisitId = visit.Id };
                await _uow.Vitals.AddAsync(visit.Vitals, cancellationToken);
            }
            visit.Vitals.BloodPressure = request.Vitals.BloodPressure;
            visit.Vitals.HeartRate = request.Vitals.HeartRate;
            visit.Vitals.Temperature = request.Vitals.Temperature;
            visit.Vitals.Weight = request.Vitals.Weight;
            visit.Vitals.Height = request.Vitals.Height;
            visit.Vitals.PO2 = request.Vitals.PO2;
            visit.Vitals.RBS = request.Vitals.RBS;
            visit.Vitals.BMI = request.Vitals.BMI;
        }

        // Map Examination
        if (request.Examination == null && visit.Examination != null) {
            visit.Examination.GeneralExamination = null;
            visit.Examination.LocalExamination = null;
            visit.Examination.PhysicalNotes = null;
            visit.Examination.Resp_Inspection = null;
            visit.Examination.Resp_Palpation = null;
            visit.Examination.Resp_Percussion = null;
            visit.Examination.Resp_Auscultation = null;
            visit.Examination.Cvs_Pulse = null;
            visit.Examination.Cvs_HeartSounds = null;
            visit.Examination.Cvs_Murmurs = null;
            visit.Examination.Cvs_Edema = null;
            visit.Examination.Cns_Consciousness = null;
            visit.Examination.Cns_MotorPower = null;
            visit.Examination.Cns_Sensation = null;
            visit.Examination.Cns_Reflexes = null;
            visit.Examination.Git_Inspection = null;
            visit.Examination.Git_Palpation = null;
            visit.Examination.Git_Percussion = null;
            visit.Examination.Git_Auscultation = null;
            visit.Examination.Msk_Swelling = null;
            visit.Examination.Msk_Tenderness = null;
            visit.Examination.Msk_Rom = null;
            visit.Examination.Msk_Deformity = null;
            visit.Examination.Skin_Rash = null;
            visit.Examination.Skin_Ulcers = null;
            visit.Examination.Skin_Pigmentation = null;
            visit.Examination.Skin_Infection = null;
        } else if (request.Examination != null) {
            if (visit.Examination == null) {
                visit.Examination = new Examination { VisitId = visit.Id };
                await _uow.Examinations.AddAsync(visit.Examination, cancellationToken);
            }
            visit.Examination.GeneralExamination = request.Examination.GeneralExamination;
            visit.Examination.LocalExamination = request.Examination.LocalExamination;
            visit.Examination.PhysicalNotes = request.Examination.PhysicalNotes;

            // Respiratory
            visit.Examination.Resp_Inspection = request.Examination.Resp_Inspection;
            visit.Examination.Resp_Palpation = request.Examination.Resp_Palpation;
            visit.Examination.Resp_Percussion = request.Examination.Resp_Percussion;
            visit.Examination.Resp_Auscultation = request.Examination.Resp_Auscultation;

            // Cardiovascular
            visit.Examination.Cvs_Pulse = request.Examination.Cvs_Pulse;
            visit.Examination.Cvs_HeartSounds = request.Examination.Cvs_HeartSounds;
            visit.Examination.Cvs_Murmurs = request.Examination.Cvs_Murmurs;
            visit.Examination.Cvs_Edema = request.Examination.Cvs_Edema;

            // Nervous
            visit.Examination.Cns_Consciousness = request.Examination.Cns_Consciousness;
            visit.Examination.Cns_MotorPower = request.Examination.Cns_MotorPower;
            visit.Examination.Cns_Sensation = request.Examination.Cns_Sensation;
            visit.Examination.Cns_Reflexes = request.Examination.Cns_Reflexes;

            // Gastrointestinal
            visit.Examination.Git_Inspection = request.Examination.Git_Inspection;
            visit.Examination.Git_Palpation = request.Examination.Git_Palpation;
            visit.Examination.Git_Percussion = request.Examination.Git_Percussion;
            visit.Examination.Git_Auscultation = request.Examination.Git_Auscultation;

            // Musculoskeletal
            visit.Examination.Msk_Swelling = request.Examination.Msk_Swelling;
            visit.Examination.Msk_Tenderness = request.Examination.Msk_Tenderness;
            visit.Examination.Msk_Rom = request.Examination.Msk_Rom;
            visit.Examination.Msk_Deformity = request.Examination.Msk_Deformity;

            // Skin
            visit.Examination.Skin_Rash = request.Examination.Skin_Rash;
            visit.Examination.Skin_Ulcers = request.Examination.Skin_Ulcers;
            visit.Examination.Skin_Pigmentation = request.Examination.Skin_Pigmentation;
            visit.Examination.Skin_Infection = request.Examination.Skin_Infection;
        }

        // Map Diagnoses (Replace all)
        if (visit.Diagnoses != null && visit.Diagnoses.Any()) {
            foreach (var d in visit.Diagnoses.ToList()) await _uow.Diagnoses.DeleteAsync(d, cancellationToken);
        }
        if (request.Diagnoses != null) {
            foreach (var d in request.Diagnoses) {
                await _uow.Diagnoses.AddAsync(new Diagnosis { VisitId = visit.Id, ICD10Code = d.ICD10Code, Description = d.Description }, cancellationToken);
            }
        }

        // Map Prescriptions (Replace all)
        if (visit.Prescriptions != null && visit.Prescriptions.Any()) {
            foreach (var p in visit.Prescriptions.ToList()) await _uow.Prescriptions.DeleteAsync(p, cancellationToken);
        }
        if (request.Prescriptions != null) {
            foreach (var p in request.Prescriptions) {
                await _uow.Prescriptions.AddAsync(new Prescription { VisitId = visit.Id, MedicationName = p.MedicationName, Dosage = p.Dosage, Instructions = p.Instructions, Duration = p.Duration }, cancellationToken);
            }
        }

        // Map LabOrders
        if (visit.LabOrders != null && visit.LabOrders.Any()) {
            foreach (var l in visit.LabOrders.ToList()) await _uow.LabOrders.DeleteAsync(l, cancellationToken);
        }
        if (request.LabOrders != null) {
            foreach (var l in request.LabOrders) {
                await _uow.LabOrders.AddAsync(new LabOrder { VisitId = visit.Id, TestName = l.TestName, OrderDate = l.OrderDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        // Map ImagingOrders
        if (visit.ImagingOrders != null && visit.ImagingOrders.Any()) {
            foreach (var i in visit.ImagingOrders.ToList()) await _uow.ImagingOrders.DeleteAsync(i, cancellationToken);
        }
        if (request.ImagingOrders != null) {
            foreach (var i in request.ImagingOrders) {
                await _uow.ImagingOrders.AddAsync(new ImagingOrder { VisitId = visit.Id, ImagingType = i.ImagingType, BodyPart = i.BodyPart, ImageData = i.ImageData, ImageUrl = i.ImageUrl, OrderDate = i.OrderDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        // Map Results
        if (visit.Results != null && visit.Results.Any()) {
            foreach (var r in visit.Results.ToList()) await _uow.Results.DeleteAsync(r, cancellationToken);
        }
        if (request.Results != null) {
            foreach (var r in request.Results) {
                await _uow.Results.AddAsync(new Result { VisitId = visit.Id, LabResult = r.LabResult, ImagingResult = r.ImagingResult, OtherResult = r.OtherResult, ImageData = r.ImageData, ImageUrl = r.ImageUrl, ResultDate = r.ResultDate ?? DateTime.UtcNow }, cancellationToken);
            }
        }

        await _uow.SaveChangesAsync(cancellationToken);
        
        return await Handle(new GetVisitByIdQuery(visit.Id), cancellationToken);
    }

    public async Task<Unit> Handle(DeleteVisitCommand request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Visit), request.Id);
            
        await _uow.Visits.DeleteAsync(visit, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }

    public async Task<Unit> Handle(AddVitalsCommand request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.VisitId, cancellationToken) ?? throw new NotFoundException(nameof(Visit), request.VisitId);
        var vitals = new Vitals
        {
            VisitId = request.VisitId,
            BloodPressure = request.BloodPressure,
            HeartRate = request.HeartRate,
            Temperature = request.Temperature,
            Weight = request.Weight,
            Height = request.Height,
            PO2 = request.PO2,
            RBS = request.RBS
        };
        await _uow.Vitals.AddAsync(vitals, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }

    public async Task<Unit> Handle(AddPrescriptionCommand request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.VisitId, cancellationToken) ?? throw new NotFoundException(nameof(Visit), request.VisitId);
        var prescription = new Prescription
        {
            VisitId = request.VisitId,
            MedicationName = request.MedicationName,
            Dosage = request.Dosage,
            Instructions = request.Instructions,
            Duration = request.Duration
        };
        await _uow.Prescriptions.AddAsync(prescription, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }

    public async Task<Unit> Handle(AddDiagnosisCommand request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.VisitId, cancellationToken) ?? throw new NotFoundException(nameof(Visit), request.VisitId);
        var diagnosis = new Diagnosis
        {
            VisitId = request.VisitId,
            ICD10Code = request.ICD10Code,
            Description = request.Description
        };
        await _uow.Diagnoses.AddAsync(diagnosis, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
    public async Task<string> Handle(UploadVisitImageCommand request, CancellationToken cancellationToken)
    {
        return await _fileService.SaveFileAsync(request.FileStream, request.FileName, "visits", cancellationToken);
    }
    public async Task<VisitDetailDto> Handle(GetVisitByIdQuery request, CancellationToken cancellationToken)
    {
        var visit = await _uow.Visits.GetByIdAsync(request.Id, cancellationToken,
            v => v.Vitals,
            v => v.Examination,
            v => v.Diagnoses,
            v => v.Prescriptions,
            v => v.LabOrders,
            v => v.ImagingOrders,
            v => v.Results)
            ?? throw new NotFoundException(nameof(Visit), request.Id);

        return new VisitDetailDto(
            visit.Id,
            visit.PatientId,
            visit.DoctorId,
            visit.VisitType,
            visit.VisitDate,
            visit.Symptoms,
            visit.Notes,
            visit.Vitals != null ? new VitalsDto {
                BloodPressure = visit.Vitals.BloodPressure,
                HeartRate = visit.Vitals.HeartRate,
                Temperature = visit.Vitals.Temperature,
                Weight = visit.Vitals.Weight,
                Height = visit.Vitals.Height,
                PO2 = visit.Vitals.PO2,
                RBS = visit.Vitals.RBS,
                BMI = visit.Vitals.BMI
            } : null,
            visit.Examination != null ? new ExaminationDto {
                GeneralExamination = visit.Examination.GeneralExamination,
                LocalExamination = visit.Examination.LocalExamination,
                PhysicalNotes = visit.Examination.PhysicalNotes,
                Resp_Inspection = visit.Examination.Resp_Inspection,
                Resp_Palpation = visit.Examination.Resp_Palpation,
                Resp_Percussion = visit.Examination.Resp_Percussion,
                Resp_Auscultation = visit.Examination.Resp_Auscultation,
                Cvs_Pulse = visit.Examination.Cvs_Pulse,
                Cvs_HeartSounds = visit.Examination.Cvs_HeartSounds,
                Cvs_Murmurs = visit.Examination.Cvs_Murmurs,
                Cvs_Edema = visit.Examination.Cvs_Edema,
                Cns_Consciousness = visit.Examination.Cns_Consciousness,
                Cns_MotorPower = visit.Examination.Cns_MotorPower,
                Cns_Sensation = visit.Examination.Cns_Sensation,
                Cns_Reflexes = visit.Examination.Cns_Reflexes,
                Git_Inspection = visit.Examination.Git_Inspection,
                Git_Palpation = visit.Examination.Git_Palpation,
                Git_Percussion = visit.Examination.Git_Percussion,
                Git_Auscultation = visit.Examination.Git_Auscultation,
                Msk_Swelling = visit.Examination.Msk_Swelling,
                Msk_Tenderness = visit.Examination.Msk_Tenderness,
                Msk_Rom = visit.Examination.Msk_Rom,
                Msk_Deformity = visit.Examination.Msk_Deformity,
                Skin_Rash = visit.Examination.Skin_Rash,
                Skin_Ulcers = visit.Examination.Skin_Ulcers,
                Skin_Pigmentation = visit.Examination.Skin_Pigmentation,
                Skin_Infection = visit.Examination.Skin_Infection
            } : null,
            visit.Diagnoses.Select(d => new DiagnosisDto(d.Id, d.ICD10Code, d.Description)).ToList(),
            visit.Prescriptions.Select(p => new PrescriptionDto(p.Id, p.MedicationName, p.Dosage, p.Instructions, p.Duration)).ToList(),
            visit.LabOrders.Select(l => new LabOrderDto(l.Id, l.TestName, l.OrderDate)).ToList(),
            visit.ImagingOrders.Select(i => new ImagingOrderDto(i.Id, i.ImagingType, i.BodyPart, i.ImageData, i.ImageUrl, i.OrderDate)).ToList(),
            visit.Results.Select(r => new ResultDto(r.Id, r.LabResult, r.ImagingResult, r.OtherResult, r.ImageData, r.ImageUrl, r.ResultDate)).ToList()
        );
    }

    public async Task<PagedVisitsResultDto> Handle(GetVisitsByPatientQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);

        var (items, totalCount) = await _uow.Visits.GetPagedAsync(
            page,
            pageSize,
            v => v.PatientId == request.PatientId,
            cancellationToken,
            v => v.Diagnoses,
            v => v.Prescriptions,
            v => v.ImagingOrders);

        var dtos = items.Select(v => new VisitSummaryDto(
            v.Id,
            v.PatientId,
            v.DoctorId,
            v.VisitType,
            v.VisitDate,
            v.Symptoms,
            v.Notes,
            v.Diagnoses.Select(d => new DiagnosisDto(d.Id, d.ICD10Code, d.Description)).ToList(),
            v.Prescriptions.Select(p => new PrescriptionDto(p.Id, p.MedicationName, p.Dosage, p.Instructions, p.Duration)).ToList(),
            v.ImagingOrders.Select(i => new ImagingOrderDto(i.Id, i.ImagingType, i.BodyPart, i.ImageData, i.ImageUrl, i.OrderDate)).ToList()
        ));

        return new PagedVisitsResultDto(dtos, totalCount, page, pageSize);
    }
}
