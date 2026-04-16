import React, { useMemo, useState } from "react";
import {
    Activity, AlertCircle, Beaker, ChevronDown, ChevronRight,
    Clock, Edit, FileText, ImageIcon, Loader2, MessageSquare,
    Pill, Stethoscope, Trash2, User, CheckCircle2, CalendarCheck, Printer, Send, Copy
} from "lucide-react";
import { useInfinitePagination } from "../../hooks/useInfinitePagination";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Timeline Section Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Individual Section Renders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ComplaintSection({ symptoms }) {
    return (
        <TimelineSection icon={MessageSquare} iconColor="text-amber-500" label="Chief Complaint">
            <p className="text-sm text-on-surface leading-relaxed italic">
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
        { label: "Temp",   value: vitals.temperature,   unit: "Â°C",   danger: vitals.temperature > 38.5 },
        { label: "Oâ‚‚",     value: vitals.po2,           unit: "%",    danger: vitals.po2 < 94 },
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
                        {v.danger && <span className="text-[8px] text-red-400 font-black">âš </span>}
                    </div>
                ))}
            </div>
        </TimelineSection>
    );
}

function DiagnosisSection({ diagnoses }) {
    const hasDx = diagnoses?.length > 0;
    const [showAll, setShowAll] = useState(false);

    const normalized = useMemo(
        () =>
            (diagnoses || [])
                .filter((d) => d?.icd10Code?.trim() || d?.description?.trim())
                .map((d) => ({
                    icd10Code: (d.icd10Code || "").trim(),
                    description: (d.description || "").trim(),
                })),
        [diagnoses]
    );

    const visible = showAll ? normalized : normalized.slice(0, 3);
    const hiddenCount = Math.max(0, normalized.length - 3);

    const copyCode = async (code) => {
        const text = (code || "").trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // best-effort; ignore
        }
    };

    return (
        <TimelineSection icon={CheckCircle2} iconColor="text-violet-500" label="Diagnosis"
            isEmpty={!hasDx} emptyText="No diagnosis recorded">
            <div className="space-y-2">
                {visible.map((d, i) => {
                    const isPrimary = i === 0;
                    return (
                        <div key={`${d.icd10Code}-${d.description}-${i}`} className="flex items-center gap-2">
                            <span
                                className={[
                                    "shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                                    isPrimary
                                        ? "bg-blue-500 text-white border border-blue-400/40 shadow-sm"
                                        : "border border-slate-600/60 text-on-surface-variant bg-transparent",
                                ].join(" ")}
                            >
                                {isPrimary ? "Primary Dx" : "Secondary"}
                            </span>

                            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-2">
                                    {d.icd10Code ? (
                                        <div className="inline-flex items-center gap-1.5 shrink-0">
                                            <span className="font-mono text-[12px] text-on-surface-variant">
                                                {d.icd10Code}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyCode(d.icd10Code)}
                                                className="p-1 rounded-md hover:bg-slate-700/30 text-on-surface-variant hover:text-primary transition-colors"
                                                title="Copy ICD code"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : null}
                                    <span className="min-w-0 truncate text-[14px] font-semibold text-on-surface">
                                        {d.description || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {hiddenCount > 0 && !showAll && (
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="text-left text-[11px] font-bold text-primary hover:text-primary-hover"
                    >
                        +{hiddenCount} more
                    </button>
                )}
                {hiddenCount > 0 && showAll && (
                    <button
                        type="button"
                        onClick={() => setShowAll(false)}
                        className="text-left text-[11px] font-bold text-primary hover:text-primary-hover"
                    >
                        Show less
                    </button>
                )}
            </div>
        </TimelineSection>
    );
}

function MedicationsSection({ prescriptions }) {
    const hasRx = prescriptions?.length > 0;

    const normalize = (s) => (s || "").toString().trim();
    const toLower = (s) => normalize(s).toLowerCase();

    const getShortCourseDays = (duration) => {
        const t = toLower(duration);
        const m = t.match(/(\d+)\s*(day|days|d)\b/);
        if (!m) return null;
        const n = Number(m[1]);
        return Number.isFinite(n) ? n : null;
    };

    const getMedicationStatus = (p) => {
        const instructions = toLower(p.instructions);
        const duration = toLower(p.duration);

        if (instructions.includes("prn") || instructions.includes("as needed")) {
            return { label: "PRN", cls: "bg-purple-100 text-purple-700 border border-purple-200" };
        }

        if (duration.includes("stop") || duration.includes("stopped") || duration.includes("discontinue") || duration.includes("completed")) {
            return { label: "Stopped", cls: "border border-red-500/50 text-red-600 bg-transparent" };
        }

        const days = getShortCourseDays(p.duration);
        if (days !== null && days <= 7) {
            return { label: "Short course", cls: "bg-amber-100 text-amber-800 border border-amber-200" };
        }

        return { label: "Active", cls: "bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]" };
    };

    const formatName = (name) => {
        const n = normalize(name);
        return n.length > 12 ? `${n.slice(0, 12)}…` : n || "Medication";
    };

    return (
        <TimelineSection icon={Pill} iconColor="text-blue-500" label="Medications"
            isEmpty={!hasRx} emptyText="No medications prescribed">
            <div className="space-y-1.5">
                {prescriptions?.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-alt border border-outline rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
                            <span className="text-sm font-bold text-on-surface truncate">{p.medicationName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                                const status = getMedicationStatus(p);
                                const name = formatName(p.medicationName);
                                const dose = normalize(p.dosage);
                                return (
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${status.cls} max-w-[200px] sm:max-w-none w-full sm:w-auto`}>
                                        <span className="flex-1 truncate min-w-0">{name}</span>
                                        {dose ? <span className="font-mono opacity-80 shrink-0">{dose}</span> : null}
                                        <span className="opacity-80 shrink-0">{status.label}</span>
                                    </span>
                                );
                            })()}
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
                        <ImageIcon className="w-3 h-3 opacity-60" />{img.imagingType} {img.bodyPart && `â€” ${img.bodyPart}`}
                    </span>
                ))}
            </div>
        </TimelineSection>
    );
}

function canonicalizeFollowUpLabel(label) {
    const l = (label || "").toLowerCase();
    if (l.includes("ai suggestion")) return "ai";
    if (l.includes("follow")) return "followup";
    return "clinical";
}

function parseFollowUpNotes(raw) {
    const text = (raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return [];

    const headerRe =
        /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?\s*(Clinical Summary|AI Suggestion(?: Analysis)?|Follow[- ]?up Instructions)\s*(?:\*\*)?\s*[:\-â€“â€”]?\s*/gi;

    const matches = [...text.matchAll(headerRe)].map((m) => ({
        idx: m.index ?? 0,
        contentStart: (m.index ?? 0) + m[0].length,
        label: m[1] || "",
    }));

    const sectionsByKey = { clinical: "", ai: "", followup: "" };

    if (matches.length === 0) {
        sectionsByKey.clinical = text;
    } else {
        const prefix = text.slice(0, matches[0].idx).trim();
        if (prefix) sectionsByKey.clinical = prefix;

        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].contentStart;
            const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;
            const content = text.slice(start, end).trim();
            const key = canonicalizeFollowUpLabel(matches[i].label);
            if (!content) continue;
            sectionsByKey[key] = sectionsByKey[key] ? `${sectionsByKey[key]}\n\n${content}` : content;
        }
    }

    const result = [
        { key: "clinical", title: "Clinical Summary", icon: Stethoscope, content: sectionsByKey.clinical?.trim() },
        { key: "ai", title: "AI Suggestion", icon: Activity, content: sectionsByKey.ai?.trim() },
        { key: "followup", title: "Follow-up Instructions", icon: CalendarCheck, content: sectionsByKey.followup?.trim() },
    ].filter((s) => s.content);

    return result.length ? result : [{ key: "clinical", title: "Clinical Summary", icon: Stethoscope, content: text }];
}

function NotesAccordionRow({ title, icon: Icon, content, defaultOpen }) {
    const [open, setOpen] = useState(!!defaultOpen);
    const [expanded, setExpanded] = useState(false);

    const showReadMore = (content || "").length > 160 || (content || "").split("\n").length > 4;

    return (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-emerald-500/10 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0 w-7 h-7 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                        {title}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-3 pb-3">
                    <p
                        className={[
                            "text-[13px] leading-[1.6] text-on-surface-variant whitespace-pre-line break-words",
                            expanded ? "" : "line-clamp-3",
                        ].join(" ")}
                    >
                        {content}
                    </p>
                    {showReadMore && (
                        <button
                            type="button"
                            onClick={() => setExpanded((p) => !p)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover"
                        >
                            {expanded ? "Show less" : "Read more"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function FollowUpSection({ notes }) {
    const sections = useMemo(() => parseFollowUpNotes(notes), [notes]);
    if (!notes?.trim() || sections.length === 0) return null;

    return (
        <TimelineSection icon={CalendarCheck} iconColor="text-emerald-500" label="Follow-up / Notes">
            <div className="space-y-2">
                {sections.map((s, idx) => (
                    <NotesAccordionRow
                        key={s.key}
                        title={s.title}
                        icon={s.icon}
                        content={s.content}
                        defaultOpen={idx === 0}
                    />
                ))}
            </div>
        </TimelineSection>
    );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function IconLabelActionButton({ label, icon: Icon, onClick, disabled, tone = "default" }) {
    const toneCls =
        tone === "destructive"
            ? "text-error border-error/40 hover:bg-error/10 hover:border-error/60"
            : "text-on-surface-variant border-slate-700/50 hover:text-primary hover:border-primary/40 hover:bg-primary/10";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl border transition-all disabled:opacity-40",
                "flex flex-col items-center justify-center gap-1 select-none",
                toneCls,
            ].join(" ")}
        >
            <Icon className="w-4 h-4" />
            <span className={`text-[11px] leading-none ${tone === "destructive" ? "text-error" : "text-on-surface-variant"}`}>
                {label}
            </span>
        </button>
    );
}

const VisitHistoryList = ({ visits, loadingChart, openFullChart, openEditVisit, handleDeleteVisit, onForwardVisit }) => {
    const sorted = [...visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    const [expandedId, setExpandedId] = useState(sorted[0]?.id ?? null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [mobileActionsId, setMobileActionsId] = useState(null);

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

                            {/* â”€â”€ Card Header (always visible) â”€â”€ */}
                            <div
                                className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3.5 text-left transition-colors cursor-pointer group/header
                                    ${isEmergency
                                        ? "bg-red-500/10 hover:bg-red-500/15"
                                        : isLatest
                                            ? "bg-primary/5 hover:bg-primary/10"
                                            : "bg-slate-800/50 hover:bg-slate-800/70"
                                    }`}
                                onClick={() => {
                                    setConfirmDeleteId(null);
                                    setMobileActionsId(null);
                                    setExpandedId(isExpanded ? null : v.id);
                                }}
                            >
                                <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto">
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
                                    <div className="min-w-0 flex-1">
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
                                        <p className={`text-xs truncate font-medium ${isEmergency ? "text-red-400" : "text-slate-400"}`}>
                                            {v.symptoms
                                                ? `"${v.symptoms.length > 70 ? v.symptoms.substring(0, 70) + "â€¦" : v.symptoms}"`
                                                : "No chief complaint recorded"}
                                        </p>
                                    </div>
                                </div>

                                {/* Right side: action buttons + chevron */}
                                <div className="relative flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto pl-[60px] sm:pl-0 mt-1 sm:mt-0" onClick={e => e.stopPropagation()}>
                                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
                                        <IconLabelActionButton
                                            label="View"
                                            icon={FileText}
                                            disabled={loadingChart}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDeleteId(null);
                                                setMobileActionsId(null);
                                                openFullChart(v.id);
                                            }}
                                        />
                                        <IconLabelActionButton
                                            label="Print"
                                            icon={Printer}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDeleteId(null);
                                                setMobileActionsId(null);
                                                window.open(`/encounter/${v.id}/report`, "_blank");
                                            }}
                                        />

                                        {/* Desktop actions */}
                                        <div className="flex items-center gap-2 max-[399px]:hidden">
                                            <IconLabelActionButton
                                                label="Forward"
                                                icon={Send}
                                                disabled={loadingChart}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(null);
                                                    setMobileActionsId(null);
                                                    if (typeof onForwardVisit === "function") onForwardVisit(v.id);
                                                }}
                                            />
                                            <IconLabelActionButton
                                                label="Edit"
                                                icon={Edit}
                                                disabled={loadingChart}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(null);
                                                    setMobileActionsId(null);
                                                    openEditVisit(v.id);
                                                }}
                                            />
                                            <IconLabelActionButton
                                                label="Delete"
                                                icon={Trash2}
                                                tone="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMobileActionsId(null);
                                                    setConfirmDeleteId((cur) => (cur === v.id ? null : v.id));
                                                }}
                                            />
                                        </div>

                                        {/* <400px overflow */}
                                        <div className="hidden max-[399px]:flex">
                                            <IconLabelActionButton
                                                label="More"
                                                icon={ChevronDown}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(null);
                                                    setMobileActionsId((cur) => (cur === v.id ? null : v.id));
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Delete confirmation popover */}
                                    {confirmDeleteId === v.id && (
                                        <div
                                            className="absolute right-0 top-full mt-2 z-30 w-56 rounded-xl border border-outline bg-surface p-3 shadow-2xl backdrop-blur"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <p className="text-xs font-bold text-on-surface">Delete this visit?</p>
                                            <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                                                This action can't be undone.
                                            </p>
                                            <div className="mt-3 flex items-center gap-2 justify-end">
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 rounded-lg border border-slate-700/50 text-[11px] font-bold text-on-surface-variant hover:bg-slate-800/60"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 rounded-lg border border-error/40 bg-error/10 text-[11px] font-black text-error hover:bg-error/15"
                                                    onClick={() => {
                                                        setConfirmDeleteId(null);
                                                        handleDeleteVisit(v.id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mobile overflow popover */}
                                    {mobileActionsId === v.id && (
                                        <div
                                            className="absolute right-0 top-full mt-2 z-30 w-64 rounded-xl border border-outline bg-surface p-3 shadow-2xl backdrop-blur"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="grid grid-cols-3 gap-2">
                                                <IconLabelActionButton
                                                    label="Forward"
                                                    icon={Send}
                                                    disabled={loadingChart}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMobileActionsId(null);
                                                        if (typeof onForwardVisit === "function") onForwardVisit(v.id);
                                                    }}
                                                />
                                                <IconLabelActionButton
                                                    label="Edit"
                                                    icon={Edit}
                                                    disabled={loadingChart}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMobileActionsId(null);
                                                        openEditVisit(v.id);
                                                    }}
                                                />
                                                <IconLabelActionButton
                                                    label="Delete"
                                                    icon={Trash2}
                                                    tone="destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMobileActionsId(null);
                                                        setConfirmDeleteId((cur) => (cur === v.id ? null : v.id));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Expand indicator (hidden on <400px) */}
                                    <div className={`ml-1 text-slate-500 transition-transform duration-200 max-[399px]:hidden ${isExpanded ? "rotate-90" : ""}`}>
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            {/* â”€â”€ Expanded Timeline Body â”€â”€ */}
                            {isExpanded && (
                                    <div className="px-4 py-4 space-y-4 border-t border-outline/40 bg-surface-alt/60 animate-fade-in">
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

