import jsPDF from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

const hasText = (value) => typeof value === "string" && value.trim() !== "";

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB");
};

const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "";
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return "";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return `${age}`;
};

const loadImageDataUrl = (src) =>
    new Promise((resolve) => {
        if (!src) {
            resolve(null);
            return;
        }

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext("2d");
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } catch (error) {
                console.error("Failed to convert logo to data URL", error);
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });

const drawPaperBackground = (doc) => {
    doc.setFillColor(247, 241, 230);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

    doc.setFillColor(252, 249, 241);
    doc.roundedRect(16, 11, PAGE_WIDTH - 32, PAGE_HEIGHT - 24, 1.5, 1.5, "F");

    doc.setDrawColor(176, 156, 119);
    doc.setLineWidth(0.35);
    doc.roundedRect(16, 11, PAGE_WIDTH - 32, PAGE_HEIGHT - 24, 1.5, 1.5);
};

const drawLogoAndTitle = (doc, logoDataUrl) => {
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", 99, 15, 12, 12);
    } else {
        doc.setFillColor(116, 76, 45);
        doc.circle(105, 21, 5.5, "F");
    }

    doc.setTextColor(116, 82, 42);
    doc.setFont("times", "italic");
    doc.setFontSize(25);
    doc.text("Dr. Ayman Mattar", 105, 37, { align: "center" });

    doc.setTextColor(25, 25, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.8);
    doc.text("General Practitioner & G.I. Specialist", 105, 45, { align: "center" });
};

const drawPatientMeta = (doc, patient, visit) => {
    const patientName = patient?.name || "";
    const age = calculateAge(patient?.dateOfBirth);
    const dateLabel = formatDate(visit?.visitDate);

    doc.setDrawColor(152, 131, 98);
    doc.setLineWidth(0.25);
    doc.rect(26, 54, 138, 16);
    doc.rect(164, 54, 20, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.7);
    doc.setTextColor(20, 20, 20);
    doc.text("PATIENT NAME:", 28, 60);
    doc.text("DATE:", 28, 68);
    doc.text("AGE:", 166, 68);

    doc.line(53, 61, 182, 61);
    doc.line(40, 69, 156, 69);
    doc.line(174, 69, 182, 69);

    doc.setFontSize(9.2);
    doc.text(patientName, 55, 59.8, { maxWidth: 124 });
    doc.text(dateLabel, 42, 67.8);
    if (age) doc.text(age, 176, 67.8);
};

const drawWatermark = (doc) => {
    doc.setTextColor(183, 153, 119);
    doc.setFont("times", "bold");
    doc.setFontSize(35);
    doc.text("Rx", 33, 95);
};

const drawPrescriptionGrid = (doc, prescriptions, visitDate) => {
    const startX = 26;
    const startY = 74;
    const widths = [22, 75, 20, 19];
    const rowHeight = 7.9;
    const totalRows = 18;
    const totalWidth = widths.reduce((sum, item) => sum + item, 0);

    doc.setDrawColor(152, 131, 98);
    doc.setLineWidth(0.23);
    doc.rect(startX, startY, totalWidth, rowHeight * totalRows);

    let x = startX;
    widths.slice(0, -1).forEach((width) => {
        x += width;
        doc.line(x, startY, x, startY + rowHeight * totalRows);
    });

    for (let row = 1; row < totalRows; row += 1) {
        doc.line(startX, startY + rowHeight * row, startX + totalWidth, startY + rowHeight * row);
    }

    const drawRowHeader = (rowIndex) => {
        const headerY = startY + rowHeight * rowIndex + 5.2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(28, 28, 28);
        doc.text("DATE:", startX + 2.5, headerY);
        doc.text("MEDICATION / DOSE / FREQUENCY", startX + widths[0] + 8, headerY);
        doc.text("DOSE", startX + widths[0] + widths[1] + 5, headerY);
        doc.text("FREQUENCY", startX + widths[0] + widths[1] + widths[2] + 1.2, headerY);
    };

    drawRowHeader(0);

    const printableRows = prescriptions.slice(0, totalRows - 1);
    printableRows.forEach((item, index) => {
        const rowIndex = index + 1;
        const baseY = startY + rowHeight * rowIndex + 5.35;
        const dateText = formatDate(item.visitDate || visitDate);
        const medication = hasText(item.medicationName) ? item.medicationName.trim() : "-";
        const dose = hasText(item.dosage) ? item.dosage.trim() : "-";
        const frequency = hasText(item.instructions)
            ? item.instructions.trim()
            : hasText(item.duration)
                ? item.duration.trim()
                : "-";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.1);
        doc.setTextColor(25, 25, 25);
        doc.text(dateText, startX + 1.5, baseY, { maxWidth: widths[0] - 3 });
        doc.text(medication, startX + widths[0] + 1.5, baseY, { maxWidth: widths[1] - 3 });
        doc.text(dose, startX + widths[0] + widths[1] + 1.5, baseY, { maxWidth: widths[2] - 3 });
        doc.text(frequency, startX + widths[0] + widths[1] + widths[2] + 1.5, baseY, {
            maxWidth: widths[3] - 3,
        });
    });

    return startY + rowHeight * totalRows;
};

const drawFooter = (doc, prescriptions) => {
    const topY = 242;
    const leftX = 28;
    const rightX = 128;
    const sectionWidth = 56;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    doc.setTextColor(24, 24, 24);
    doc.text("SPECIAL INSTRUCTIONS", leftX, topY);
    doc.text("FOLLOW-UP APPOINTMENT", rightX, topY);

    doc.setDrawColor(152, 131, 98);
    doc.setLineWidth(0.22);
    for (let i = 1; i <= 3; i += 1) {
        doc.line(leftX, topY + i * 7, leftX + sectionWidth, topY + i * 7);
        doc.line(rightX, topY + i * 7, rightX + sectionWidth, topY + i * 7);
    }

    const instructionText = prescriptions
        .map((item) => item.instructions)
        .filter(hasText)
        .slice(0, 2)
        .join(" | ");

    if (instructionText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.text(instructionText, leftX + 1, topY + 5.3, { maxWidth: sectionWidth - 2 });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(35, 35, 35);
    doc.text("ADDRESS: Cairo, Egypt", 27, 276);
    doc.text("PHONE: 01206070140", 87, 276);
};

export const generateMedicationAdministrationPdf = async ({
    patient,
    visit,
    logoSrc = "/favicon.ico",
}) => {
    const doc = new jsPDF("p", "mm", "a4");
    const prescriptions = (visit?.prescriptions || []).filter(
        (item) =>
            hasText(item.medicationName) ||
            hasText(item.dosage) ||
            hasText(item.instructions) ||
            hasText(item.duration)
    );

    const logoDataUrl = await loadImageDataUrl(logoSrc);

    drawPaperBackground(doc);
    drawLogoAndTitle(doc, logoDataUrl);
    drawPatientMeta(doc, patient, visit);
    drawWatermark(doc);
    drawPrescriptionGrid(doc, prescriptions, visit?.visitDate);
    drawFooter(doc, prescriptions);

    const safeName = (patient?.name || "patient").replace(/[\\/:*?"<>|]+/g, "_");
    doc.save(`Medication_Administration_${safeName}.pdf`);
};
