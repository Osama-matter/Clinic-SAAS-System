import jsPDF from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// ── Palette (warm gold / medical) ──────────────────────────────────────────
const GOLD_DARK = [116, 82, 42];   // doctor name, accents
const GOLD_MID = [176, 148, 100];   // borders, lines
const GOLD_LIGHT = [240, 232, 210];   // header bg, row stripe
const CREAM = [252, 249, 241];   // card bg
const PAGE_BG = [247, 241, 230];   // outer bg
const TEXT_DARK = [28, 28, 28];
const TEXT_MID = [90, 90, 90];
const GREEN_BG = [234, 243, 222];   // dose badge bg
const GREEN_FG = [59, 109, 17];   // dose badge text
const STAMP_FG = [140, 120, 80];

// ── Helpers ────────────────────────────────────────────────────────────────
const hasText = (v) => typeof v === "string" && v.trim() !== "";

const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB");
};

const calculateAge = (dob) => {
    if (!dob) return "";
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return `${age}`;
};

const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");

const loadImageDataUrl = (src) =>
    new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const c = document.createElement("canvas");
                c.width = img.width; c.height = img.height;
                c.getContext("2d").drawImage(img, 0, 0);
                resolve(c.toDataURL("image/png"));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

// ── 1. Paper background ────────────────────────────────────────────────────
const drawBackground = (doc) => {
    doc.setFillColor(...PAGE_BG);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

    doc.setFillColor(...CREAM);
    doc.roundedRect(12, 10, PAGE_WIDTH - 24, PAGE_HEIGHT - 20, 2, 2, "F");

    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, 10, PAGE_WIDTH - 24, PAGE_HEIGHT - 20, 2, 2);
};

// ── 2. Header band ─────────────────────────────────────────────────────────
// Mimics: avatar circle | doctor name + specialty + badge
const drawHeader = (doc, logoDataUrl) => {
    const bandY = 10;
    const bandH = 36;
    const innerX = 12;
    const innerW = PAGE_WIDTH - 24;

    // warm header bg
    doc.setFillColor(...GOLD_LIGHT);
    doc.roundedRect(innerX, bandY, innerW, bandH, 2, 2, "F");
    // bottom edge of band — straight line (override rounded bottom)
    doc.setFillColor(...GOLD_LIGHT);
    doc.rect(innerX, bandY + bandH - 4, innerW, 4, "F");
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.3);
    doc.line(innerX, bandY + bandH, innerX + innerW, bandY + bandH);

    // Avatar circle (logo or initials fallback)
    const avatarCX = 32;
    const avatarCY = bandY + bandH / 2;
    const avatarR = 11;

    doc.setFillColor(...GOLD_MID);
    doc.circle(avatarCX, avatarCY, avatarR, "F");

    if (logoDataUrl) {
        const imgSize = avatarR * 1.5;
        doc.addImage(logoDataUrl, "PNG",
            avatarCX - imgSize / 2, avatarCY - imgSize / 2,
            imgSize, imgSize);
    } else {
        // initials "AM"
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("AM", avatarCX, avatarCY + 3.5, { align: "center" });
    }

    // Doctor name
    const textX = avatarCX + avatarR + 6;
    doc.setTextColor(...GOLD_DARK);
    doc.setFont("times", "italic");
    doc.setFontSize(18);
    doc.text("Dr. Ayman Mattar", textX, bandY + 16);

    // Specialty
    doc.setTextColor(...TEXT_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("General Practitioner & G.I. Specialist", textX, bandY + 23);

    // License badge (pill)
    const badgeX = textX;
    const badgeY = bandY + 26;
    const badgeW = 46;
    const badgeH = 5.5;
    doc.setFillColor(240, 228, 195);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.2);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5);
    doc.setTextColor(...GOLD_DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Medical License Active", badgeX + badgeW / 2, badgeY + 3.8, { align: "center" });
};

// ── 3. Patient meta row ────────────────────────────────────────────────────
// Three labelled fields: Patient Name | Date | Age
const drawPatientMeta = (doc, patient, visit) => {
    const rowY = 46;   // flush below header band
    const rowH = 18;
    const innerX = 12;
    const innerW = PAGE_WIDTH - 24;

    doc.setFillColor(248, 244, 234);
    doc.rect(innerX, rowY, innerW, rowH, "F");
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.25);
    doc.line(innerX, rowY, innerX + innerW, rowY);
    doc.line(innerX, rowY + rowH, innerX + innerW, rowY + rowH);

    // column dividers
    const col1W = innerW * 0.50;
    const col2W = innerW * 0.32;
    doc.line(innerX + col1W, rowY, innerX + col1W, rowY + rowH);
    doc.line(innerX + col1W + col2W, rowY, innerX + col1W + col2W, rowY + rowH);

    const labelY = rowY + 5;
    const valueY = rowY + 11.5;

    const drawField = (x, w, label, value) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...TEXT_MID);
        // uppercase label via manual uppercase
        doc.text(label.toUpperCase(), x + 3, labelY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_DARK);
        doc.text(value || "—", x + 3, valueY, { maxWidth: w - 6 });
    };

    drawField(innerX, col1W, "Patient name", patient?.name || "");
    drawField(innerX + col1W, col2W, "Date", formatDate(visit?.visitDate));
    drawField(innerX + col1W + col2W, innerW - col1W - col2W, "Age", calculateAge(patient?.dateOfBirth));
};

// ── 4. Rx symbol ───────────────────────────────────────────────────────────
// Sits in the narrow gap between the meta row and the table header.
// Rendered before the table so it stays visually behind the grid.
// No "PRESCRIPTION" label — it was bleeding into data rows.
const drawRxSymbol = (doc) => {
    doc.setTextColor(215, 198, 160); // faint warm gold
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("\u211E", TABLE_X + 2, TABLE_Y - 1.2);
};

// ── 5. Medication table ────────────────────────────────────────────────────
const COL_WIDTHS = [22, 68, 24, 72]; // Date | Medication | Dose | Frequency
const TABLE_X = 12;
const TABLE_Y = 72;  // 8 mm gap below meta row (which ends at ~64)
const ROW_H = 8.2;
const TOTAL_ROWS = 16; // 1 header + 15 data rows
const TABLE_W = COL_WIDTHS.reduce((s, w) => s + w, 0);

const drawTableHeader = (doc) => {
    doc.setFillColor(...GOLD_LIGHT);
    doc.rect(TABLE_X, TABLE_Y, TABLE_W, ROW_H, "F");

    const headers = ["DATE", "MEDICATION", "DOSE", "FREQUENCY & INSTRUCTIONS"];
    let x = TABLE_X;
    headers.forEach((h, i) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...GOLD_DARK);
        doc.text(h, x + 2.5, TABLE_Y + 5.5, { maxWidth: COL_WIDTHS[i] - 5 });
        x += COL_WIDTHS[i];
    });
};

const drawTableGrid = (doc) => {
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.22);

    // outer rect
    doc.rect(TABLE_X, TABLE_Y, TABLE_W, ROW_H * TOTAL_ROWS);

    // vertical dividers
    let x = TABLE_X;
    COL_WIDTHS.slice(0, -1).forEach((w) => {
        x += w;
        doc.line(x, TABLE_Y, x, TABLE_Y + ROW_H * TOTAL_ROWS);
    });

    // horizontal row lines — thicker after header, very faint for empty rows
    for (let r = 1; r < TOTAL_ROWS; r += 1) {
        const y = TABLE_Y + ROW_H * r;
        doc.setDrawColor(...GOLD_MID);
        if (r === 1) {
            doc.setLineWidth(0.4);  // thick separator after header
        } else {
            doc.setLineWidth(0.1);  // very faint for all data/empty rows
        }
        doc.line(TABLE_X, y, TABLE_X + TABLE_W, y);
    }
};

// Draws a small rounded "dose badge" (green pill)
const drawDoseBadge = (doc, text, x, y) => {
    const pad = 2.5;
    const fSize = 6.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fSize);
    const w = doc.getTextWidth(text) + pad * 2;
    const h = 4.5;
    doc.setFillColor(...GREEN_BG);
    doc.roundedRect(x, y - 3.4, w, h, 1.2, 1.2, "F");
    doc.setTextColor(...GREEN_FG);
    doc.text(text, x + pad, y - 0.3);
};

const drawTableRows = (doc, prescriptions, visitDate) => {
    const dataRows = prescriptions.slice(0, TOTAL_ROWS - 1);

    dataRows.forEach((item, idx) => {
        const rowY = TABLE_Y + ROW_H * (idx + 1);
        const baseY = rowY + 5.4;

        // alternating stripe
        if (idx % 2 === 0) {
            doc.setFillColor(252, 249, 244);
            doc.rect(TABLE_X, rowY, TABLE_W, ROW_H, "F");
            // re-draw grid lines on top of stripe
            doc.setDrawColor(...GOLD_MID);
            doc.setLineWidth(0.15);
            doc.line(TABLE_X, rowY + ROW_H, TABLE_X + TABLE_W, rowY + ROW_H);
        }

        const dateText = formatDate(item.visitDate || visitDate);
        const medName = hasText(item.medicationName) ? item.medicationName.trim() : "—";
        const dose = hasText(item.dosage) ? item.dosage.trim() : "";
        const frequency = hasText(item.instructions)
            ? item.instructions.trim()
            : hasText(item.duration) ? item.duration.trim() : "—";

        let colX = TABLE_X;

        // Date
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...TEXT_MID);
        doc.text(dateText, colX + 2.5, baseY, { maxWidth: COL_WIDTHS[0] - 5 });
        colX += COL_WIDTHS[0];

        // Medication name (bold)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.8);
        doc.setTextColor(...TEXT_DARK);
        doc.text(medName, colX + 2.5, baseY, { maxWidth: COL_WIDTHS[1] - 5 });
        colX += COL_WIDTHS[1];

        // Dose badge
        if (dose) {
            drawDoseBadge(doc, dose, colX + 1.5, baseY);
        }
        colX += COL_WIDTHS[2];

        // Frequency
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...TEXT_MID);
        doc.text(frequency, colX + 2.5, baseY, { maxWidth: COL_WIDTHS[3] - 5 });
    });
};

// ── 6. Footer (two-column) ─────────────────────────────────────────────────
const drawFooter = (doc, prescriptions) => {
    const footerY = TABLE_Y + ROW_H * TOTAL_ROWS + 6;
    const innerX = 12;
    const innerW = PAGE_WIDTH - 24;
    const midX = innerX + innerW / 2 + 2;
    const blockW = innerW / 2 - 6;

    // divider between columns
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.25);
    doc.line(midX - 2, footerY, midX - 2, footerY + 30);

    const drawBlock = (x, label, content) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(...TEXT_MID);
        doc.text(label.toUpperCase(), x, footerY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_DARK);
        doc.text(content || "—", x, footerY + 11, { maxWidth: blockW });

        // signature line
        doc.setDrawColor(...GOLD_MID);
        doc.setLineWidth(0.2);
        doc.line(x, footerY + 26, x + blockW, footerY + 26);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...TEXT_MID);
        doc.text("Signature", x, footerY + 29.5);
    };

    const instructionText = prescriptions
        .map((p) => p.instructions)
        .filter(hasText)
        .slice(0, 2)
        .join(" | ");

    drawBlock(innerX + 2, "Special instructions", instructionText);
    drawBlock(midX, "Follow-up appointment", "");

    // Clinic stamp bar
    const stampY = PAGE_HEIGHT - 18;
    doc.setFillColor(...GOLD_LIGHT);
    doc.rect(innerX, stampY, innerW, 9, "F");
    doc.setDrawColor(...GOLD_MID);
    doc.setLineWidth(0.25);
    doc.line(innerX, stampY, innerX + innerW, stampY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...STAMP_FG);
    doc.text("Royal Clinic  —  Medication Administration Record", innerX + innerW / 2, stampY + 5.5, { align: "center" });

    // contact line
    doc.setFontSize(6.5);
    doc.text("ADDRESS: Cairo, Egypt", innerX + 6, stampY + 9 + 4);
    doc.text("PHONE: 01206070140", innerX + innerW / 2, stampY + 9 + 4);
};

// ── Main export ────────────────────────────────────────────────────────────
export const generateMedicationAdministrationPdf = async ({
    patient,
    visit,
    logoSrc = "/favicon.ico",
}) => {
    const doc = new jsPDF("p", "mm", "a4");

    const prescriptions = (visit?.prescriptions || []).filter(
        (p) =>
            hasText(p.medicationName) ||
            hasText(p.dosage) ||
            hasText(p.instructions) ||
            hasText(p.duration)
    );

    const logoDataUrl = await loadImageDataUrl(logoSrc);

    drawBackground(doc);
    drawHeader(doc, logoDataUrl);
    drawPatientMeta(doc, patient, visit);
    drawRxSymbol(doc);
    drawTableGrid(doc);
    drawTableHeader(doc);
    drawTableRows(doc, prescriptions, visit?.visitDate);
    drawFooter(doc, prescriptions);

    const safeName = (patient?.name || "patient").replace(/[\\/:*?"<>|]+/g, "_");
    doc.save(`Medication_Administration_${safeName}.pdf`);
};