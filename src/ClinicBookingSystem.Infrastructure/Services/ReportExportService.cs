using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ClinicBookingSystem.Infrastructure.Services;

public class ReportExportService : IReportExportService
{
    private readonly ApplicationDbContext _context;

    public ReportExportService(ApplicationDbContext context) => _context = context;

    public async Task<byte[]> ExportAppointmentsCsvAsync(DateTime? from, DateTime? to, Guid? doctorId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Appointments
            .Include(a => a.Doctor)
            .Include(a => a.User)
            .AsQueryable();

        if (from.HasValue) query = query.Where(a => a.SlotDateTime >= from.Value);
        if (to.HasValue) query = query.Where(a => a.SlotDateTime <= to.Value);
        if (doctorId.HasValue) query = query.Where(a => a.DoctorId == doctorId.Value);

        var appointments = await query.OrderBy(a => a.SlotDateTime).ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("BookingReference,PatientName,PatientEmail,PatientPhone,DoctorName,SlotDateTime,Status,Notes,CreatedAt");

        foreach (var a in appointments)
        {
            var patientName = a.User?.Name ?? a.PatientName ?? "";
            var patientEmail = a.User?.Email ?? a.PatientEmail ?? "";
            var patientPhone = a.User?.PhoneNumber ?? a.PatientPhone ?? "";

            sb.AppendLine(string.Join(",",
                CsvEscape(a.BookingReference),
                CsvEscape(patientName),
                CsvEscape(patientEmail),
                CsvEscape(patientPhone),
                CsvEscape(a.Doctor.Name),
                CsvEscape(a.SlotDateTime.ToString("yyyy-MM-dd HH:mm")),
                CsvEscape(a.Status.ToString()),
                CsvEscape(a.Notes ?? ""),
                CsvEscape(a.CreatedAt.ToString("yyyy-MM-dd HH:mm"))
            ));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var bom = Encoding.UTF8.GetPreamble();
        return bom.Concat(bytes).ToArray();
    }

    public async Task<byte[]> ExportAppointmentsPdfAsync(DateTime? from, DateTime? to, Guid? doctorId = null, CancellationToken cancellationToken = default)
    {
        // Fetch all necessary data
        var appQuery = _context.Appointments
            .Include(a => a.Doctor)
            .Include(a => a.User)
            .AsQueryable();

        if (from.HasValue) appQuery = appQuery.Where(a => a.SlotDateTime >= from.Value);
        if (to.HasValue) appQuery = appQuery.Where(a => a.SlotDateTime <= to.Value);
        if (doctorId.HasValue) appQuery = appQuery.Where(a => a.DoctorId == doctorId.Value);

        var appointments = await appQuery.OrderBy(a => a.SlotDateTime).ToListAsync(cancellationToken);
        var patients = await _context.Users.Where(u => u.Role == ClinicBookingSystem.Domain.Enums.UserRole.Patient).ToListAsync(cancellationToken);

        // Stats
        var total = appointments.Count;
        var confirmed = appointments.Count(a => a.Status == ClinicBookingSystem.Domain.Enums.AppointmentStatus.Confirmed);
        var completed = appointments.Count(a => a.Status == ClinicBookingSystem.Domain.Enums.AppointmentStatus.Completed);

        var sb = new StringBuilder();
        sb.AppendLine("%PDF-1.4");
        sb.AppendLine("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
        sb.AppendLine("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");

        var streamContent = new StringBuilder();
        streamContent.AppendLine("BT /F1 14 Tf 50 750 Td (CLINICFLOW - FULL SYSTEM REPORT) Tj");
        streamContent.AppendLine("0 -20 Td /F1 10 Tf (Generated: " + DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC) Tj");
        
        // Dashboard Stats
        streamContent.AppendLine("0 -40 Td /F2 12 Tf (DASHBOARD SUMMARY) Tj");
        streamContent.AppendLine("0 -20 Td /F1 10 Tf (Total Appointments: " + total + ") Tj");
        streamContent.AppendLine("0 -15 Td (Confirmed: " + confirmed + ") Tj");
        streamContent.AppendLine("0 -15 Td (Completed: " + completed + ") Tj");

        // Patients
        streamContent.AppendLine("0 -40 Td /F2 12 Tf (PATIENTS REGISTRY) Tj");
        streamContent.AppendLine("0 -20 Td /F1 10 Tf (Name | Email | Phone) Tj");
        foreach(var p in patients) 
        {
            streamContent.AppendLine("0 -15 Td (" + PdfSafe(p.Name) + " | " + PdfSafe(p.Email) + " | " + PdfSafe(p.PhoneNumber ?? "-") + ") Tj");
        }

        // Bookings
        streamContent.AppendLine("0 -40 Td /F2 12 Tf (APPOINTMENTS LIST) Tj");
        streamContent.AppendLine("0 -20 Td /F1 10 Tf (Ref | Doctor | Date | Status) Tj");
        foreach(var a in appointments)
        {
            streamContent.AppendLine("0 -15 Td (" + a.BookingReference + " | Dr. " + PdfSafe(a.Doctor.Name) + " | " + a.SlotDateTime.ToString("MM/dd HH:mm") + " | " + a.Status + ") Tj");
        }

        streamContent.AppendLine("ET");

        var stream = streamContent.ToString();
        int streamBytesLength = Encoding.UTF8.GetByteCount(stream);
        sb.AppendLine("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 2000] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj");
        sb.AppendLine($"4 0 obj << /Length {streamBytesLength} >> stream");
        sb.Append(stream);
        sb.AppendLine("\nendstream\nendobj");
        sb.AppendLine("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
        sb.AppendLine("6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj");

        // Manually calculate xref for simple valid PDF
        long catalogPos = 9;
        long pagesPos = catalogPos + "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\r\n".Length;
        long pagePos = pagesPos + "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\r\n".Length;
        string pageStr = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 2000] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\r\n";
        long contentPos = pagePos + pageStr.Length;
        string contentHead = $"4 0 obj << /Length {streamBytesLength} >> stream\r\n";
        long font1Pos = contentPos + contentHead.Length + streamBytesLength + "\nendstream\nendobj\r\n".Length;
        long font2Pos = font1Pos + "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\r\n".Length;
        long xrefPos = font2Pos + "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\r\n".Length;

        sb.AppendLine("xref");
        sb.AppendLine("0 7");
        sb.AppendLine("0000000000 65535 f ");
        sb.AppendLine(catalogPos.ToString("D10") + " 00000 n ");
        sb.AppendLine(pagesPos.ToString("D10") + " 00000 n ");
        sb.AppendLine(pagePos.ToString("D10") + " 00000 n ");
        sb.AppendLine(contentPos.ToString("D10") + " 00000 n ");
        sb.AppendLine(font1Pos.ToString("D10") + " 00000 n ");
        sb.AppendLine(font2Pos.ToString("D10") + " 00000 n ");
        sb.AppendLine("trailer << /Size 7 /Root 1 0 R >>");
        sb.AppendLine("startxref");
        sb.AppendLine(xrefPos.ToString());
        sb.AppendLine("%%EOF");

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private string PdfSafe(string val) => (val ?? "").Replace("(", "\\(").Replace(")", "\\)");

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
