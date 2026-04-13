import React from "react";
import {
    Activity, FileText, FileSearch, Pill, Trash2, Edit,
    ImageIcon, User, Clock, AlertCircle, ChevronDown, Calendar
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIT_TYPE_CONFIG = {
    1: { label: "Initial Visit", bg: "bg-emerald-500/15", text: "text-emerald-400",  border: "border-emerald-500/30" },
    2: { label: "Follow-Up",     bg: "bg-info/15",        text: "text-info",          border: "border-info/30"         },
    3: { label: "Emergency",     bg: "bg-destructive/15", text: "text-destructive",   border: "border-destructive/30"  },
    4: { label: "Routine",       bg: "bg-secondary",      text: "text-muted-foreground", border: "border-border/50"   },
};
const DEFAULT_TYPE = { label: "Visit", bg: "bg-secondary", text: "text-muted-foreground", border: "border-border/50" };
const getTypeConfig = (type) => VISIT_TYPE_CONFIG[type] ?? DEFAULT_TYPE;

function formatVisitDate(rawDate) {
    const d = new Date(rawDate);
    return {
        day:     d.getDate(),
        month:   d.toLocaleString("default", { month: "short" }),
        year:    d.getFullYear(),
        time:    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        display: d.toLocaleDateString("default", { weekday: "short", month: "long", day: "numeric", year: "numeric" }),
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SymptomsSection({ symptoms }) {
    return (
        <div className="rounded-lg border border-border/30 bg-secondary/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <Activity className="h-3.5 w-3.5 text-warning" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Chief Complaint</span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed italic pl-0.5">
                {symptoms
                    ? `"${symptoms}"`
                    : <span className="not-italic text-muted-foreground/40">No complaint recorded</span>}
            </p>
        </div>
    );
}

function DiagnosisSection({ diagnoses }) {
    const hasDx = diagnoses?.length > 0;
    return (
        <div className="rounded-lg border border-border/30 bg-secondary/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <FileSearch className="h-3.5 w-3.5 text-destructive" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Assessment</span>
            </div>
            {hasDx ? (
                <ul className="space-y-1.5 pl-0.5">
                    {diagnoses.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                            {d.icd10Code && (
                                <span className="mt-0.5 shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-mono font-medium text-destructive leading-none pt-1">
                                    {d.icd10Code}
                                </span>
                            )}
                            <span className="text-sm text-foreground/80 leading-snug">{d.description}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <span className="text-sm text-muted-foreground/40 pl-0.5">No diagnosis recorded</span>
            )}
        </div>
    );
}

function TreatmentSection({ prescriptions }) {
    const hasRx = prescriptions?.length > 0;
    return (
        <div className="rounded-lg border border-border/30 bg-secondary/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <Pill className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Treatment Plan</span>
            </div>
            {hasRx ? (
                <ul className="space-y-1.5 pl-0.5">
                    {prescriptions.slice(0, 4).map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm text-foreground/80 truncate">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                                {p.medicationName}
                            </span>
                            {p.dosage && (
                                <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/30">
                                    {p.dosage}
                                </span>
                            )}
                        </li>
                    ))}
                    {prescriptions.length > 4 && (
                        <li className="text-[11px] text-primary pl-3">+{prescriptions.length - 4} more</li>
                    )}
                </ul>
            ) : (
                <span className="text-sm text-muted-foreground/40 pl-0.5">No medications prescribed</span>
            )}
        </div>
    );
}

function VisitMeta({ doctorId, visitId, hasImages }) {
    return (
        <details className="mt-3 pt-3 border-t border-dashed border-border/30 group">
            <summary className="flex w-fit cursor-pointer list-none select-none items-center gap-1.5
                text-[11px] font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                Visit metadata
            </summary>
            <div className="mt-2 flex flex-wrap gap-3 pl-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3 text-muted-foreground/50" />
                    <span>Physician:</span>
                    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/30">
                        {doctorId?.substring(0, 8)}
                    </code>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 text-muted-foreground/50" />
                    <span>Ref:</span>
                    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/30">
                        {visitId?.substring(0, 8)}
                    </code>
                </div>
                {hasImages && (
                    <div className="flex items-center gap-1.5 text-xs text-info font-medium">
                        <ImageIcon className="h-3 w-3" />
                        Imaging attached
                    </div>
                )}
            </div>
        </details>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VisitHistoryList = ({ visits, loadingChart, openFullChart, openEditVisit, handleDeleteVisit }) => {
    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/30 py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <FileText className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No visit records found</p>
                <p className="text-xs text-muted-foreground/50 max-w-xs">
                    Clinical encounters will appear here once logged in the system.
                </p>
            </div>
        );
    }

    const sorted = [...visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

    return (
        <div className="relative space-y-4 pb-8">
            {/* Timeline rail */}
            <div className="absolute left-[39px] top-5 bottom-0 w-px bg-gradient-to-b from-border/60 to-transparent hidden sm:block" />

            {sorted.map((v, idx) => {
                const date      = formatVisitDate(v.visitDate);
                const typeConf  = getTypeConfig(v.visitType);
                const isEmergency = v.visitType === 3;
                const hasImages = v.imagingOrders?.some((io) => io.imageUrl || io.imageData);

                return (
                    <div key={v.id} className="relative pl-0 sm:pl-[72px]">
                        {/* Timeline node */}
                        <div className={`absolute left-[34px] top-6 h-3 w-3 rounded-full border-2 shadow-sm hidden sm:block z-10
                            ${isEmergency ? "border-destructive bg-destructive/20" : "border-primary bg-primary/20"}`} />

                        {/* Card */}
                        <div className={`rounded-xl border backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-black/20
                            ${isEmergency
                                ? "border-destructive/30 bg-destructive/5 ring-1 ring-destructive/10"
                                : "border-border/50 bg-card/80 hover:border-border"}`}>

                            {/* Header */}
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-t-xl border-b
                                ${isEmergency ? "bg-destructive/10 border-destructive/20" : "bg-secondary/40 border-border/30"}`}>
                                <div className="flex items-center gap-3">
                                    {/* Date block */}
                                    <div className={`flex flex-col items-center justify-center min-w-[52px] rounded-lg border px-2 py-2 text-center
                                        ${isEmergency
                                            ? "bg-destructive/15 border-destructive/30 text-destructive"
                                            : "bg-card border-border/50 text-foreground"}`}>
                                        <span className="text-[9px] font-medium uppercase tracking-wider opacity-60">{date.month}</span>
                                        <span className="text-xl font-bold leading-none">{date.day}</span>
                                        <span className="text-[9px] opacity-50">{date.year}</span>
                                    </div>

                                    {/* Identity */}
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider
                                                ${typeConf.bg} ${typeConf.text} ${typeConf.border}`}>
                                                {isEmergency && <AlertCircle className="h-3 w-3" />}
                                                {typeConf.label}
                                            </span>
                                            {idx === 0 && (
                                                <span className="rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                    Latest
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                                                <Clock className="h-3 w-3" />
                                                {date.time}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate max-w-xs ${isEmergency ? "text-destructive" : "text-muted-foreground"}`}>
                                            {v.symptoms
                                                ? `"${v.symptoms.length > 60 ? v.symptoms.substring(0, 60) + "…" : v.symptoms}"`
                                                : "No chief complaint recorded"}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => openFullChart(v.id)}
                                        disabled={loadingChart}
                                        title="View full chart"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30
                                            text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/10
                                            transition-all disabled:opacity-40"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => openEditVisit(v.id)}
                                        disabled={loadingChart}
                                        title="Edit visit"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30
                                            text-muted-foreground hover:border-info/30 hover:text-info hover:bg-info/10
                                            transition-all disabled:opacity-40"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteVisit(v.id)}
                                        title="Delete record"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30
                                            text-muted-foreground hover:border-destructive/30 hover:text-destructive hover:bg-destructive/10
                                            transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Clinical content */}
                            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <SymptomsSection symptoms={v.symptoms} />
                                <DiagnosisSection diagnoses={v.diagnoses} />
                                <TreatmentSection prescriptions={v.prescriptions} />
                            </div>

                            {/* Meta */}
                            <div className="px-5 pb-4">
                                <VisitMeta doctorId={v.doctorId} visitId={v.id} hasImages={hasImages} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VisitHistoryList;