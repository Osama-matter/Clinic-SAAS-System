import React, { useRef } from "react";
import {
    Activity, ArrowLeft, Beaker, Calendar, CheckCircle2,
    ClipboardList, Download, FileSearch, ImageIcon, Pill,
    Printer, Stethoscope, UserRound,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";
import { getFileUrl } from "../../services/api";
import { isVitalDanger } from "./utils";

const formatVisitType = (t) => {
    switch (t) {
        case 1: return "Initial Consultation";
        case 2: return "Follow-Up";
        case 3: return "Emergency";
        default: return "Routine Checkup";
    }
};

const getAssetSrc = (item) => {
    if (!item) return null;
    if (item.imageUrl) return getFileUrl(item.imageUrl);
    if (item.imageData) return item.imageData;
    return null;
};

const hasText = (v) => typeof v === "string" && v.trim() !== "";

// ── Reusable section card ──
function SectionCard({ title, icon: Icon, iconColor = "text-primary", children, className = "" }) {
    return (
        <section className={`rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 ${className}`}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
            </div>
            {children}
        </section>
    );
}

// ── Value block ──
function ValueBlock({ label, value, className = "" }) {
    if (!hasText(value)) return null;
    return (
        <div className={`rounded-lg border border-border/30 bg-secondary/40 p-3 ${className}`}>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
            <p dir="auto" className="whitespace-pre-wrap break-words text-sm text-foreground leading-relaxed">{value}</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VisitChartDetail = ({ selectedVisit, onBack }) => {
    const chartRef = useRef(null);

    const imagingOrders  = selectedVisit.imagingOrders  || [];
    const results        = selectedVisit.results        || [];
    const diagnoses      = selectedVisit.diagnoses      || [];
    const prescriptions  = selectedVisit.prescriptions  || [];
    const labOrders      = selectedVisit.labOrders      || [];
    const examination    = selectedVisit.examination;
    const vitals         = selectedVisit.vitals;

    const handleExportPDF = async () => {
        const element = chartRef.current;
        if (!element) return;
        const loadingToast = toast.loading("Generating PDF...");
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#0f1117" });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Visit_Chart_${selectedVisit.id.substring(0, 8)}.pdf`);
            toast.success("PDF exported successfully", { id: loadingToast });
        } catch (error) {
            toast.error("Failed to generate PDF", { id: loadingToast });
        }
    };

    const systemGroups = [
        { title: "Respiratory",    value: [examination?.resp_Inspection, examination?.resp_Palpation, examination?.resp_Percussion, examination?.resp_Auscultation] },
        { title: "Cardiovascular", value: [examination?.cvs_Pulse, examination?.cvs_HeartSounds, examination?.cvs_Murmurs, examination?.cvs_Edema] },
        { title: "Nervous System", value: [examination?.cns_Consciousness, examination?.cns_MotorPower, examination?.cns_Sensation, examination?.cns_Reflexes] },
        { title: "GIT",            value: [examination?.git_Inspection, examination?.git_Palpation, examination?.git_Percussion, examination?.git_Auscultation] },
        { title: "Musculoskeletal",value: [examination?.msk_Swelling, examination?.msk_Tenderness, examination?.msk_Rom, examination?.msk_Deformity] },
        { title: "Skin",           value: [examination?.skin_Rash, examination?.skin_Ulcers, examination?.skin_Pigmentation, examination?.skin_Infection] },
    ]
        .map((g) => ({ ...g, value: g.value.filter(Boolean).join(" | ") }))
        .filter((g) => hasText(g.value));

    const vitalCards = [
        { label: "Blood Pressure", field: "bloodPressure", value: vitals?.bloodPressure, unit: "mmHg" },
        { label: "Heart Rate",     field: "heartRate",     value: vitals?.heartRate,     unit: "BPM"  },
        { label: "Temperature",    field: "temperature",   value: vitals?.temperature,   unit: "°C"   },
        { label: "O₂ Saturation",  field: "po2",           value: vitals?.po2,           unit: "%"    },
        { label: "RBS",            field: "rbs",           value: vitals?.rbs,           unit: "mg/dL"},
        { label: "Weight",         field: "weight",        value: vitals?.weight,        unit: "kg"   },
        { label: "Height",         field: "height",        value: vitals?.height,        unit: "cm"   },
        { label: "BMI",            field: "bmi",           value: vitals?.bmi,           unit: ""     },
    ].filter((c) => c.value !== null && c.value !== undefined && c.value !== "");

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-4 py-2
                        text-sm font-medium text-muted-foreground hover:border-border hover:text-foreground transition-all"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/50
                            text-muted-foreground hover:border-border hover:text-foreground transition-all"
                        title="Print"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
                            shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                    >
                        <Download className="h-4 w-4" /> Export PDF
                    </button>
                </div>
            </div>

            {/* Chart body */}
            <div ref={chartRef} className="space-y-5">
                {/* Chart header */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-6 py-5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-foreground">Clinical Record</h1>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                        Medical encounter summary
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    {new Date(selectedVisit.visitDate).toLocaleDateString("en-US", {
                                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                                    })}
                                </div>
                                <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary text-sm">
                                    {formatVisitType(selectedVisit.visitType)}
                                </div>
                            </div>
                        </div>

                        <div className="min-w-[220px] rounded-lg border border-border/50 bg-secondary/40 p-4">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Patient Information</p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground">
                                    <UserRound className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Patient Record</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                                        ID: {selectedVisit.patientId?.substring(0, 8)}...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                    {/* Left column */}
                    <div className="space-y-5">
                        {/* Symptoms & Notes */}
                        <SectionCard title="Symptoms and Notes" icon={FileSearch}>
                            <div className="grid gap-3">
                                <ValueBlock label="Chief Complaint" value={selectedVisit.symptoms || "No symptoms recorded."} />
                                <ValueBlock label="Clinical Notes" value={selectedVisit.notes} />
                            </div>
                        </SectionCard>

                        {/* Physical Examination */}
                        <SectionCard title="Physical Examination" icon={Stethoscope} iconColor="text-emerald-400">
                            {examination ? (
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <ValueBlock label="General Examination" value={examination.generalExamination} />
                                    <ValueBlock label="Local Examination" value={examination.localExamination} />
                                    <ValueBlock label="Additional Notes" value={examination.physicalNotes} className="lg:col-span-2" />
                                    {systemGroups.map((g) => (
                                        <ValueBlock key={g.title} label={g.title} value={g.value} />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border/30 bg-secondary/20 p-5
                                    text-sm text-muted-foreground/50">
                                    No structured physical examination documented.
                                </div>
                            )}
                        </SectionCard>

                        {/* Imaging */}
                        <SectionCard title="Imaging and Attachments" icon={ImageIcon} iconColor="text-info">
                            {imagingOrders.length > 0 ? (
                                <div className="grid gap-4">
                                    {imagingOrders.map((img, i) => {
                                        const src = getAssetSrc(img);
                                        return (
                                            <div key={i} className="overflow-hidden rounded-lg border border-border/30 bg-secondary/30">
                                                <div className="flex items-center justify-between gap-2 border-b border-border/30 px-3 py-2.5">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{img.imagingType || "Imaging Order"}</p>
                                                        {hasText(img.bodyPart) && (
                                                            <p className="text-xs text-muted-foreground/60 mt-0.5">{img.bodyPart}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {src ? (
                                                    <a href={src} target="_blank" rel="noreferrer" className="block bg-black/30">
                                                        <img src={src} alt="Imaging" className="h-56 w-full object-contain" />
                                                    </a>
                                                ) : (
                                                    <div className="flex h-40 items-center justify-center bg-secondary/20 text-sm text-muted-foreground/40">
                                                        No attachment uploaded
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border/30 bg-secondary/20 p-5 text-sm text-muted-foreground/50">
                                    No imaging orders or uploaded images available.
                                </div>
                            )}
                        </SectionCard>

                        {/* Lab Results */}
                        <SectionCard title="Lab Results and Reports" icon={Beaker} iconColor="text-warning">
                            <div className="space-y-4">
                                {results.length > 0 ? results.map((result, i) => {
                                    const src = getAssetSrc(result);
                                    return (
                                        <div key={i} className="rounded-lg border border-border/30 bg-secondary/30 p-4">
                                            <div className="grid gap-3 mb-4">
                                                <ValueBlock label="Lab Result" value={result.labResult} />
                                                <ValueBlock label="Imaging Result" value={result.imagingResult} />
                                                <ValueBlock label="Other Notes" value={result.otherResult} />
                                            </div>
                                            <div className="overflow-hidden rounded-lg border border-border/30">
                                                {src ? (
                                                    <a href={src} target="_blank" rel="noreferrer" className="block bg-black/30">
                                                        <img src={src} alt="Result" className="h-48 w-full object-contain" />
                                                    </a>
                                                ) : (
                                                    <div className="flex h-28 items-center justify-center bg-secondary/20 text-sm text-muted-foreground/40">
                                                        No result image
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="rounded-lg border border-dashed border-border/30 bg-secondary/20 p-5 text-sm text-muted-foreground/50">
                                        No test results recorded for this visit.
                                    </div>
                                )}

                                {labOrders.length > 0 && (
                                    <div className="rounded-lg border border-border/30 bg-secondary/30 p-4">
                                        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Requested Tests</p>
                                        <div className="flex flex-wrap gap-2">
                                            {labOrders.map((lab, i) => (
                                                <span key={i}
                                                    className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                                                    {lab.testName || "Unnamed test"}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-5">
                        {/* Vitals */}
                        <SectionCard title="Vitals" icon={Activity} iconColor="text-destructive">
                            {vitalCards.length > 0 ? (
                                <div className="space-y-2">
                                    {vitalCards.map((item) => (
                                        <div key={item.label}
                                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors
                                                ${isVitalDanger(item.field, item.value)
                                                    ? "border-destructive/30 bg-destructive/10"
                                                    : "border-border/30 bg-secondary/40"}`}>
                                            <p className={`text-xs font-medium ${isVitalDanger(item.field, item.value) ? "text-destructive" : "text-muted-foreground"}`}>
                                                {item.label}
                                            </p>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-semibold ${isVitalDanger(item.field, item.value) ? "text-destructive" : "text-foreground"}`}>
                                                    {item.value}
                                                </span>
                                                {item.unit && <span className="text-[10px] text-muted-foreground/50">{item.unit}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border/30 bg-secondary/20 p-5 text-sm text-muted-foreground/50">
                                    No vitals captured.
                                </div>
                            )}
                        </SectionCard>

                        {/* Diagnoses */}
                        <SectionCard title="Assessment & Diagnoses" icon={CheckCircle2} iconColor="text-violet-400">
                            {diagnoses.length > 0 ? (
                                <div className="space-y-2">
                                    {diagnoses.map((d, i) => (
                                        <div key={i} className="rounded-lg border border-border/30 bg-secondary/40 p-3">
                                            {hasText(d.icd10Code) && (
                                                <span className="mb-1.5 inline-flex rounded bg-violet-500/15 px-2 py-0.5 text-[10px] font-mono font-medium text-violet-400">
                                                    {d.icd10Code}
                                                </span>
                                            )}
                                            <p dir="auto" className="text-sm text-foreground/90 break-words">
                                                {d.description || "Diagnosis entry"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border/30 bg-secondary/20 p-4 text-sm text-muted-foreground/50">
                                    No diagnoses recorded.
                                </div>
                            )}
                        </SectionCard>

                        {/* Prescriptions */}
                        <section className="rounded-xl border border-primary/20 bg-primary p-5">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                                <Pill className="h-4 w-4 text-primary-foreground/70" />
                                <h2 className="text-sm font-medium uppercase tracking-wider text-primary-foreground/70">Rx &amp; Plan</h2>
                            </div>
                            {prescriptions.length > 0 ? (
                                <div className="space-y-3">
                                    {prescriptions.map((rx, i) => (
                                        <div key={i} className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                                            {hasText(rx.medicationName) && (
                                                <p dir="auto" className="text-sm font-semibold text-primary-foreground">{rx.medicationName}</p>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {hasText(rx.dosage) && (
                                                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-primary-foreground uppercase tracking-wider">
                                                        {rx.dosage}
                                                    </span>
                                                )}
                                                {hasText(rx.duration) && (
                                                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-primary-foreground uppercase tracking-wider">
                                                        {rx.duration}
                                                    </span>
                                                )}
                                            </div>
                                            {hasText(rx.instructions) && (
                                                <p dir="auto" className="mt-2 rounded-lg bg-black/10 p-2.5 text-xs text-primary-foreground/80 whitespace-pre-wrap">
                                                    {rx.instructions}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-sm text-primary-foreground/60">
                                    No medications or treatment plan recorded.
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-2 border-t border-border/30 pt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Verified Medical Record
                    </div>
                    <div className="break-all">Digital Reference: {selectedVisit.id}</div>
                    <div>© {new Date().getFullYear()}</div>
                </div>
            </div>
        </div>
    );
};

export default VisitChartDetail;