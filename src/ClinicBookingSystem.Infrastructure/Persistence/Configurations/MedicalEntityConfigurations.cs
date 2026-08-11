using ClinicBookingSystem.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicBookingSystem.Infrastructure.Persistence.Configurations;

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(150);
        builder.Property(p => p.Phone).IsRequired().HasMaxLength(20);
        builder.Property(p => p.Allergies).HasMaxLength(1000);
        builder.Property(p => p.ChronicDiseases).HasMaxLength(1000);
        builder.Property(p => p.DrugHistory).HasMaxLength(1000);
        builder.HasIndex(p => p.TenantId);
        builder.HasIndex(p => new { p.TenantId, p.Phone });
        builder.HasIndex(p => new { p.TenantId, p.Name });
    }
}

public class VisitConfiguration : IEntityTypeConfiguration<Visit>
{
    public void Configure(EntityTypeBuilder<Visit> builder)
    {
        builder.HasKey(v => v.Id);
        
        builder.HasOne(v => v.Patient)
               .WithMany(p => p.Visits)
               .HasForeignKey(v => v.PatientId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(v => v.Doctor)
               .WithMany()
               .HasForeignKey(v => v.DoctorId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(v => v.Symptoms).HasMaxLength(2000);
        builder.Property(v => v.Notes).HasMaxLength(4000);
        builder.HasIndex(v => v.TenantId);
        builder.HasIndex(v => new { v.TenantId, v.PatientId, v.VisitDate });
        builder.HasIndex(v => new { v.TenantId, v.DoctorId, v.VisitDate });
    }
}

public class VitalsConfiguration : IEntityTypeConfiguration<Vitals>
{
    public void Configure(EntityTypeBuilder<Vitals> builder)
    {
        builder.HasKey(v => v.Id);
        
        builder.HasOne(v => v.Visit)
               .WithOne(v => v.Vitals)
               .HasForeignKey<Vitals>(v => v.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(v => v.BloodPressure).HasMaxLength(20);
        builder.Property(v => v.Temperature).HasColumnType("decimal(5,2)");
        builder.Property(v => v.Weight).HasColumnType("decimal(5,2)");
        builder.Property(v => v.Height).HasColumnType("decimal(5,2)");
        builder.Property(v => v.PO2).HasColumnType("decimal(5,2)");
        builder.Property(v => v.RBS).HasColumnType("decimal(5,2)");
        builder.Property(v => v.BMI).HasColumnType("decimal(5,2)");
        builder.HasIndex(v => v.TenantId);
    }
}

public class ExaminationConfiguration : IEntityTypeConfiguration<Examination>
{
    public void Configure(EntityTypeBuilder<Examination> builder)
    {
        builder.HasKey(e => e.Id);
        
        builder.HasOne(e => e.Visit)
               .WithOne(v => v.Examination)
               .HasForeignKey<Examination>(e => e.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(e => e.GeneralExamination).HasMaxLength(2000);
        builder.Property(e => e.LocalExamination).HasMaxLength(2000);
        builder.Property(e => e.PhysicalNotes).HasMaxLength(2000);
        builder.HasIndex(e => e.TenantId);
    }
}

public class DiagnosisConfiguration : IEntityTypeConfiguration<Diagnosis>
{
    public void Configure(EntityTypeBuilder<Diagnosis> builder)
    {
        builder.HasKey(d => d.Id);
        
        builder.HasOne(d => d.Visit)
               .WithMany(v => v.Diagnoses)
               .HasForeignKey(d => d.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(d => d.ICD10Code).HasMaxLength(20);
        builder.Property(d => d.Description).HasMaxLength(1000);
        builder.HasIndex(d => d.TenantId);
    }
}

public class DrugConfiguration : IEntityTypeConfiguration<Drug>
{
    public void Configure(EntityTypeBuilder<Drug> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Name).IsRequired();
        builder.Property(d => d.Form).IsRequired();
    }
}

public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.HasKey(p => p.Id);
        
        builder.HasOne(p => p.Visit)
               .WithMany(v => v.Prescriptions)
               .HasForeignKey(p => p.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(p => p.MedicationName).HasMaxLength(200);
        builder.Property(p => p.Dosage).HasMaxLength(100);
        builder.Property(p => p.Instructions).HasMaxLength(500);
        builder.Property(p => p.Duration).HasMaxLength(100);
        builder.HasIndex(p => p.TenantId);
    }
}

public class LabOrderConfiguration : IEntityTypeConfiguration<LabOrder>
{
    public void Configure(EntityTypeBuilder<LabOrder> builder)
    {
        builder.HasKey(l => l.Id);
        
        builder.HasOne(l => l.Visit)
               .WithMany(v => v.LabOrders)
               .HasForeignKey(l => l.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(l => l.TestName).HasMaxLength(200);
        builder.HasIndex(l => l.TenantId);
    }
}

public class ImagingOrderConfiguration : IEntityTypeConfiguration<ImagingOrder>
{
    public void Configure(EntityTypeBuilder<ImagingOrder> builder)
    {
        builder.HasKey(i => i.Id);
        
        builder.HasOne(i => i.Visit)
               .WithMany(v => v.ImagingOrders)
               .HasForeignKey(i => i.VisitId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(i => i.ImagingType).HasMaxLength(100);
        builder.Property(i => i.BodyPart).HasMaxLength(100);
        builder.HasIndex(i => i.TenantId);
    }
}

public class ResultConfiguration : IEntityTypeConfiguration<Result>
{
    public void Configure(EntityTypeBuilder<Result> builder)
    {
        builder.HasKey(r => r.Id);
        
        builder.HasOne(r => r.Visit)
               .WithMany(v => v.Results)
               .HasForeignKey(r => r.VisitId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.LabOrder)
               .WithMany(l => l.Results)
               .HasForeignKey(r => r.LabOrderId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.ImagingOrder)
               .WithMany(i => i.Results)
               .HasForeignKey(r => r.ImagingOrderId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(r => r.LabResult).HasMaxLength(2000);
        builder.Property(r => r.ImagingResult).HasMaxLength(2000);
        builder.Property(r => r.OtherResult).HasMaxLength(2000);
        builder.HasIndex(r => r.TenantId);
    }
}
