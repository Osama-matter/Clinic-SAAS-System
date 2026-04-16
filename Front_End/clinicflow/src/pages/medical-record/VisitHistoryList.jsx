import React, { useState } from "react";
import {
    Activity, AlertCircle, Beaker, ChevronDown, ChevronRight,
    Clock, Edit, FileText, ImageIcon, Loader2, MessageSquare,
    Pill, Stethoscope, Trash2, User, CheckCircle2, CalendarCheck, Printer
} from "lucide-react";
import { useInfinitePagination } from "../../hooks/useInfinitePagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIT_TYPE_CONFIG = {
    1: { label: "Initial Visit",  bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    2: { label: "Follow-Up",      bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30"    },
    3: { label: "Emergency",      bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30",    pulse: true },
    4: { label: "Routine",        bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-400/20"   },
};
const DEFAULT_TYPE = { label: "Visit", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-400/20" };
const getTypeConfig = (type) => VISIT_TYPE_CONFIG[type] ?? DEFAULT_TYPE;

function formatVisitDate(rawDate) {
    const d = new Date(rawDate);
    return {
        day:     d.getDate(),
        month:   d.toLocaleString("default", { month: "short" }),
        year:    d.getFullYear(),
        time:    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        full:    d.toLocaleDateString("default", { weekday: "short", month: "long", day: "numeric", year: "numeric" }),
    };
}

// ─── Timeline Section Wrapper ─────────────────────────────────────────────────

function TimelineSection({ icon: Icon, iconColor, label, children, isEmpty, emptyText }) {
    if (isEmpty && !emptyText) return null;
    return (
        <div className="flex gap-3">
            <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${iconColor} border border-current/20 bg-current/10`}>
                <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                {isEmpty ? (
                    <p className="text-xs text-slate-500 italic">{emptyText}</p>
                ) : children}
            </div>
        </div>
    );
}

// ─── Individual Section Renders ───────────────────────────────────────────────

function ComplaintSection({ symptoms }) {
    return (
        <TimelineSection icon={MessageSquare} iconColor="text-amber-500" label="Chief Complaint">
            <p className="text-sm text-slate-200 leading-relaxed italic">
                {symptoms ? `"${symptoms}"` : <span className="not-italic text-slate-500">No complaint recorded</span>}
            </p>
        </TimelineSection>
    );
}

function VitalsSection({ vitals }) {
    if (!vitals) return null;
    const items = [
        { label: "BP",     value: vitals.bloodPressure, unit: "mmHg", danger: false },
        { label: "HR",     value: vitals.heartRate,     unit: "bpm",  danger: vitals.heartRate > 100 || vitals.heartRate < 50 },
        { label: "Temp",   value: vitals.temperature,   unit: "°C",   danger: vitals.temperature > 38.5 },
        { label: "O₂",     value: vitals.po2,           unit: "%",    danger: vitals.po2 < 94 },
        { label: "RBS",    value: vitals.rbs,           unit: "mg/dL",danger: vitals.rbs > 200 },
        { label: "BMI",    value: vitals.bmi,           unit: "",     danger: vitals.bmi > 30 || vitals.bmi < 18.5 },
    ].filter(v => v.value !== null && v.value !== undefined && v.value !== "");

    if (items.length === 0) return null;

    return (
        <TimelineSection icon={Activity} iconColor="text-rose-500" label="Vitals">
            <div className="flex flex-wrap gap-1.5">
                {items.map(v => (
                    <div key={v.label} className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold
                        ${v.danger
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-slate-800/60 border-slate-700/50 text-slate-300"
                        }`}>
                        <span className="text-[9px] font-black uppercase opacity-60">{v.label}</span>
                        <span>{v.value}</span>
                        {v.unit && <span className="text-[9px] opacity-50">{v.unit}</span>}
                        {v.danger && <span className="text-[8px] text-red-400 font-black">⚠</span>}
                    </div>
                ))}
            </div>
        </TimelineSection>
    );
}

function DiagnosisSection({ diagnoses }) {
    const hasDx = diagnoses?.length > 0;
    return (
        <TimelineSection icon={CheckCircle2} iconColor="text-violet-500" label="Diagnosis"
            isEmpty={!hasDx} emptyText="No diagnosis recorded">
            <div className="space-y-1">
                {diagnoses?.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                        {d.icd10Code && (
                            <span className="shrink-0 mt-0.5 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-violet-400 border border-violet-500/20 leading-none pt-1">
                                {d.icd10Code}
                            </span>
                        )}
                        <span className="text-sm text-slate-200 leading-snug">{d.description}</span>
                    </div>
                ))}
            </div>
        </TimelineSection>
    );
}

function MedicationsSection({ prescriptions }) {
    const hasRx = prescriptions?.length > 0;
    return (
        <TimelineSection icon={Pill} iconColor="text-blue-500" label="Medications"
            isEmpty={!hasRx} emptyText="No medications prescribed">
            <div className="space-y-1.5">
                {prescriptions?.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
                            <span className="text-sm font-bold text-slate-200 truncate">{p.medicationName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {p.dosage && (
                                <span className="text-[9px] font-black uppercase bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">
                                    {p.dosage}
                                </span>
                            )}
                            {p.duration && (
                                <span className="text-[9px] font-bold text-slate-500">{p.duration}</span>
                            )}
                        </div>
                    </div>
                ))}
                {prescriptions?.length > 4 && (
                    <p className="text-[11px] text-blue-400 font-bold">+{prescriptions.length - 4} more medications</p>
                )}
            </div>
        </TimelineSection>
    );
}

function LabsSection({ labOrders, imagingOrders }) {
    const hasLabs    = labOrders?.length > 0;
    const hasImaging = imagingOrders?.some(i => i.imagingType);
    if (!hasLabs && !hasImaging) return null;

    return (
        <TimelineSection icon={Beaker} iconColor="text-yellow-500" label="Labs & Imaging">
            <div className="flex flex-wrap gap-1.5">
                {labOrders?.map((l, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
                        <Beaker className="w-3 h-3 opacity-60" />{l.testName || "Lab Order"}
                    </span>
                ))}
                {imagingOrders?.filter(i => i.imagingType).map((img, i) => (
                    <span key={`img-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
                        <ImageIcon className="w-3 h-3 opacity-60" />{img.imagingType} {img.bodyPart && `— ${img.bodyPart}`}
                    </span>
                ))}
            </div>
        </TimelineSection>
    );
}

function FollowUpSection({ notes }) {
    if (!notes?.trim()) return null;
    return (
        <TimelineSection icon={CalendarCheck} iconColor="text-emerald-500" label="Follow-up / Notes">
            <p className="text-sm text-slate-300 leading-relaxed bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                {notes}
            </p>
        </TimelineSection>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VisitHistoryList = ({ visits, loadingChart, openFullChart, openEditVisit, handleDeleteVisit }) => {
    const sorted = [...visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    const [expandedId, setExpandedId] = useState(sorted[0]?.id ?? null);

    const {
        visibleItems: visibleVisits,
        hasMore: hasMoreVisits,
        loadMoreRef: visitsLoadMoreRef,
    } = useInfinitePagination(sorted, 8);

    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700/40 py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/40">
                    <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-500">No visit records found</p>
                <p className="text-xs text-slate-600 max-w-xs">
                    Clinical encounters will appear here once logged in the system.
                </p>
            </div>
        );
    }

    return (
        <div className="relative space-y-3 pb-8">
            {/* Vertical timeline rail */}
            <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-slate-600/40 via-slate-700/20 to-transparent hidden sm:block" />

            {visibleVisits.map((v, idx) => {
                const date      = formatVisitDate(v.visitDate);
                const typeConf  = getTypeConfig(v.visitType);
                const isEmergency  = v.visitType === 3;
                const isExpanded   = expandedId === v.id;
                const isLatest     = idx === 0;

                return (
                    <div key={v.id} className="relative pl-0 sm:pl-11">
                        {/* Timeline node */}
                        <div className={`absolute left-[13px] top-5 w-3.5 h-3.5 rounded-full border-2 z-10 hidden sm:flex items-center justify-center
                            ${isEmergency
                                ? "border-red-500 bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                : isLatest
                                    ? "border-primary bg-primary/20 shadow-[0_0_6px_var(--color-primary)]"
                                    : "border-slate-600 bg-slate-800"
                            }`}
                        />

                        {/* Card */}
                        <div className={`rounded-2xl border overflow-hidden transition-all duration-200
                            ${isEmergency
                                ? "border-red-500/30 shadow-[inset_0_0_40px_rgba(239,68,68,0.04)]"
                                : isLatest
                                    ? "border-primary/20 shadow-[inset_0_0_40px_rgba(var(--color-primary-rgb),0.03)]"
                                    : "border-slate-700/40"
                            }`}>

                            {/* ── Card Header (always visible) ── */}
                            <div
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer group/header
                                    ${isEmergency
                                        ? "bg-red-500/10 hover:bg-red-500/15"
                                        : isLatest
                                            ? "bg-primary/5 hover:bg-primary/10"
                                            : "bg-slate-800/50 hover:bg-slate-800/70"
                                    }`}
                                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Date block */}
                                    <div className={`shrink-0 flex flex-col items-center justify-center w-12 rounded-xl border py-2 text-center
                                        ${isEmergency
                                            ? "bg-red-500/15 border-red-500/30 text-red-400"
                                            : "bg-slate-900/60 border-slate-700/50 text-slate-300"
                                        }`}>
                                        <span className="text-[8px] font-black uppercase tracking-wider opacity-60">{date.month}</span>
                                        <span className="text-lg font-black leading-none">{date.day}</span>
                                        <span className="text-[8px] opacity-40">{date.year}</span>
                                    </div>

                                    {/* Meta */}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider
                                                ${typeConf.bg} ${typeConf.text} ${typeConf.border}`}>
                                                {isEmergency && <AlertCircle className="h-2.5 w-2.5" />}
                                                {typeConf.label}
                                            </span>
                                            {isLatest && (
                                                <span className="rounded-lg border border-primary/30 bg-primary/15 px-2 py-0.5 text-[9px] font-black text-primary uppercase tracking-wider">
                                                    Latest
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <Clock className="h-3 w-3" />{date.time}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate max-w-xs font-medium ${isEmergency ? "text-red-400" : "text-slate-400"}`}>
                                            {v.symptoms
                                                ? `"${v.symptoms.length > 70 ? v.symptoms.substring(0, 70) + "…" : v.symptoms}"`
                                                : "No chief complaint recorded"}
                                        </p>
                                    </div>
                                </div>

                                {/* Right side: action buttons + chevron */}
                                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openFullChart(v.id);
                                        }}
                                        disabled={loadingChart}
                                        title="View Full Report"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/50
                                            text-primary hover:border-primary hover:bg-primary/10
                                            transition-all disabled:opacity-40 shadow-sm"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`/encounter/${v.id}/report`, '_blank');
                                        }}
                                        title="Professional Print (New Tab)"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/50
                                            text-emerald-500 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10
                                            transition-all disabled:opacity-40"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditVisit(v.id);
                                        }}
                                        disabled={loadingChart}
                                        title="Edit visit"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50
                                            text-slate-500 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/10
                                            transition-all disabled:opacity-40"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteVisit(v.id);
                                        }}
                                        title="Delete record"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50
                                            text-slate-500 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10
                                            transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <div className={`ml-1 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            {/* ── Expanded Timeline Body ── */}
                            {isExpanded && (
                                <div className="px-4 py-4 space-y-4 border-t border-slate-700/30 bg-slate-900/30 animate-fade-in">
                                    {/* 6-section structured timeline */}
                                    <ComplaintSection symptoms={v.symptoms} />

                                    {v.vitals && (
                                        <VitalsSection vitals={v.vitals} />
                                    )}

                                    <DiagnosisSection diagnoses={v.diagnoses} />

                                    <MedicationsSection prescriptions={v.prescriptions} />

                                    <LabsSection
                                        labOrders={v.labOrders}
                                        imagingOrders={v.imagingOrders}
                                    />

                                    <FollowUpSection notes={v.notes} />

                                    {/* Visit metadata footer */}
                                    <div className="pt-2 border-t border-slate-700/20 flex flex-wrap gap-3 text-[10px] text-slate-600">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            Dr. {v.doctorId?.substring(0, 8)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Stethoscope className="w-3 h-3" />
                                            Ref: {v.id?.substring(0, 8)}
                                        </span>
                                        {v.imagingOrders?.some(io => io.imageUrl || io.imageData) && (
                                            <span className="flex items-center gap-1 text-sky-500">
                                                <ImageIcon className="w-3 h-3" />
                                                Imaging attached
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {hasMoreVisits && (
                <div ref={visitsLoadMoreRef} className="flex items-center justify-center py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/40 bg-slate-800/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more visits
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitHistoryList;
