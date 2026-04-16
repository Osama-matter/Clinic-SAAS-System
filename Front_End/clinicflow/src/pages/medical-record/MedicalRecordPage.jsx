import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ArrowLeft, Plus, Activity, FileDown, Clock, Sparkles, X, User, Phone, Calendar, ShieldAlert, Pill, HeartPulse, FileText, Loader2 } from "lucide-react";
import { recordFileOpen, recordPatientOpen, recordVisitSessionComplete, recordVisitSessionStart } from "../../lib/doctorActivity";
import toast from "react-hot-toast";

// â”€â”€â”€ Local imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { usePatientRecord } from "./usePatientRecord";
import { useMedicalForm } from "./useMedicalForm";
import { sortVisitsByDate } from "./medicalUtils";

import EncounterDetailsSection from "./EncounterDetailsSection";
import PatientBackgroundSection from "./PatientBackgroundSection";
import VitalsSection from "./VitalsSection";
import ExaminationSection from "./ExaminationSection";
import LabImagingOrdersSection from "./LabImagingOrdersSection";
import TestResultsSection from "./TestResultsSection";
import DiagnosisRxSection from "./DiagnosisRxSection";
import VisitFormBottomBar from "./VisitFormBottomBar";
import VisitHistoryList from "./VisitHistoryList";
import VisitChartDetail from "./VisitChartDetail";
import StickyPatientHeader from "./StickyPatientHeader";
import { CLINICAL_PROTOCOLS } from "./clinicalKnowledge";
import AISuggestionDrawer from "./AISuggestionDrawer";
import { generateVisitSuggestion } from "../../services/aiService";


// â”€â”€â”€ View modes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VIEW = { HISTORY: "history", NEW: "new-visit", EDIT: "edit-visit", CHART: "chart-detail" };

// â”€â”€â”€ Patient profile sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PatientProfileCard({ patient, generatingPrescription, onGeneratePdf }) {
    const isMale = patient.gender === 1;
    const isFemale = patient.gender === 2;
    const genderLabel = isMale ? "Male" : isFemale ? "Female" : "Not specified";
    const genderColor = isMale ? "from-blue-600 to-blue-800" : isFemale ? "from-rose-500 to-rose-700" : "from-slate-600 to-slate-800";
    const genderBadge = isMale
        ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
        : isFemale
            ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"
            : "bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600/50";

    const dobDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    const dobValid = !!(dobDate && !Number.isNaN(dobDate.getTime()));
    const isFutureDob = dobValid && dobDate > new Date();
    const isRTL = document.documentElement.dir === "rtl" || document.documentElement.lang === "ar";
    
    const dobFormatted = dobValid
        ? dobDate.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" })
        : "—";

    const computeAgeYears = (d) => {
        const now = new Date();
        let years = now.getFullYear() - d.getFullYear();
        const hasHadBirthdayThisYear =
            now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
        if (!hasHadBirthdayThisYear) years -= 1;
        return years;
    };

    const ageYears = dobValid && !isFutureDob ? computeAgeYears(dobDate) : null;
    const ageDisplay =
        dobValid && !isFutureDob
            ? (dobDate.getFullYear() === new Date().getFullYear() ? "0 years" : `${Math.max(0, ageYears)} years`)
            : "N/A";

    const rawPhone = (patient.phone || patient.phoneNumber || "").trim();
    const phoneIsPlaceholder = rawPhone.toLowerCase() === "fsdfs";
    const phoneDisplay = rawPhone && !phoneIsPlaceholder ? rawPhone : "—";

    const clinicalFlags = [
        patient.allergies && { label: "Allergies", value: patient.allergies, icon: ShieldAlert, theme: "red" },
        patient.chronicDiseases && { label: "Chronic", value: patient.chronicDiseases, icon: HeartPulse, theme: "orange" },
        patient.drugHistory && { label: "Active Meds", value: patient.drugHistory, icon: Pill, theme: "blue" },
    ].filter(Boolean);

    const flagTheme = {
        red: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-300",
        orange: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/25 text-orange-600 dark:text-orange-300",
        blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25 text-blue-600 dark:text-blue-300",
    };
    const flagIconTheme = {
        red: "text-red-500 dark:text-red-400",
        orange: "text-orange-500 dark:text-orange-400",
        blue: "text-blue-500 dark:text-blue-400",
    };

    return (
        <div dir={isRTL ? "rtl" : "ltr"} className="overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50">
            {/* â”€â”€ Top colored accent bar â”€â”€ */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${genderColor}`} />

            <div className="p-6 sm:p-8">
                {/* â”€â”€ Main row: avatar + info + action â”€â”€ */}
                <div className="flex flex-col md:flex-row md:items-start gap-6">

                    {/* Avatar */}
                    <div className={`relative shrink-0 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${genderColor} shadow-xl`}>
                        <User className="h-10 w-10 sm:h-12 sm:w-12 text-white/80" />
                        <div className={`absolute -bottom-2 ${isRTL ? "-left-2" : "-right-2"} rounded-full bg-emerald-500 w-5 h-5 flex items-center justify-center border-2 border-white dark:border-slate-900`}>
                            <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                        {/* Name + Gender badge */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                                {patient.name}
                            </h1>
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${genderBadge}`}>
                                {genderLabel}
                            </span>
                        </div>

                        {/* Data grid: DOB, Age, Phone, File ID */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            <PatientDataCell
                                icon={<Calendar className="h-3.5 w-3.5" />}
                                label="Date of Birth"
                                value={dobFormatted}
                                warning={isFutureDob ? "Future date" : null}
                                noTruncate
                                isRTL={isRTL}
                            />
                            <PatientDataCell
                                icon={<User className="h-3.5 w-3.5" />}
                                label="Age"
                                value={ageDisplay}
                                warning={isFutureDob ? "Future DOB" : null}
                                isRTL={isRTL}
                            />
                            <PatientDataCell
                                icon={<Phone className="h-3.5 w-3.5" />}
                                label="Phone"
                                value={phoneDisplay}
                                valueClassName={phoneDisplay === "—" ? "italic" : ""}
                                isRTL={isRTL}
                            />
                            <PatientDataCell
                                icon={<FileText className="h-3.5 w-3.5" />}
                                label="File No."
                                value={patient.id ? `PT-${patient.id.substring(0, 6).toUpperCase()}` : "â€”"}
                                isRTL={isRTL}
                            />
                        </div>
                    </div>

                    {/* Generate Prescription Button */}
                    <div className="shrink-0 flex flex-col items-end gap-3">
                        <button
                            type="button"
                            onClick={onGeneratePdf}
                            disabled={generatingPrescription}
                            className="group flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingPrescription
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <FileDown className="h-4 w-4 transition-transform group-hover:scale-110" />
                            }
                            {generatingPrescription ? "Preparing..." : "Generate Prescription"}
                        </button>
                    </div>
                </div>

                {/* â”€â”€ Clinical Flags row â”€â”€ */}
                {clinicalFlags.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700/50 flex flex-wrap gap-2.5">
                        {clinicalFlags.map(({ label, value, icon: Icon, theme }) => (
                            <div key={label} className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${flagTheme[theme]}`}>
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${flagIconTheme[theme]}`} />
                                <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 opacity-80 dark:opacity-60 leading-none mb-1">{label}</p>
                                    <p className="text-xs font-bold leading-tight truncate max-w-[180px] text-slate-900 dark:text-inherit">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatMinutesAgo(ts) {
    if (!ts || Number.isNaN(ts)) return "";
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return "";
    const mins = Math.max(0, Math.round(diffMs / 60000));
    if (mins <= 0) return "saved just now";
    if (mins === 1) return "saved 1 minute ago";
    return `saved ${mins} minutes ago`;
}


function PatientDataCell({ icon, label, value, warning, isRTL, noTruncate, valueClassName }) {
    const textAlignClass = isRTL ? "text-right" : "text-left";
    return (
        <div className={`flex flex-col gap-1 rounded-xl border px-4 py-3 transition-all ${warning
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/40"
            }`}>
            <div className={`flex items-center gap-1.5 ${warning ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                {icon}
                <span className={`text-[9px] font-black uppercase tracking-widest ${textAlignClass}`}>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <p
                    className={[
                        "text-sm font-bold",
                        noTruncate ? "" : "truncate",
                        warning ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-200",
                        textAlignClass,
                        valueClassName || "",
                    ].join(" ")}
                >
                    {value}
                </p>
                {warning && (
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0.5 rounded-full">
                        âš  {warning}
                    </span>
                )}
            </div>
        </div>
    );
}

// â”€â”€â”€ Vitals sidebar sub-component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VitalsSidebar({ latestVitals, visits }) {
    const lastVisitDate = visits.length > 0
        ? new Date(sortVisitsByDate(visits)[0].visitDate).toLocaleDateString()
        : "N/A";

    const getBmiCategory = (bmi) => {
        const b = parseFloat(bmi);
        if (!b) return { label: "", color: "text-slate-400", bg: "bg-slate-50" };
        if (b < 18.5) return { label: "Underweight", color: "text-amber-600", bg: "bg-amber-50" };
        if (b < 25) return { label: "Normal", color: "text-emerald-600", bg: "bg-emerald-50" };
        if (b < 30) return { label: "Overweight", color: "text-orange-600", bg: "bg-orange-50" };
        return { label: "Obese", color: "text-red-600", bg: "bg-red-50" };
    };

    const bmiCat = getBmiCategory(latestVitals?.bmi);

    const vitalRows = [
        { label: "BP", value: latestVitals?.bloodPressure, unit: "mmHg", icon: "ðŸ©¸" },
        { label: "HR", value: latestVitals?.heartRate, unit: "BPM", icon: "ðŸ’“" },
        { label: "Temp", value: latestVitals?.temperature, unit: "Â°C", icon: "ðŸŒ¡ï¸" },
        { label: "Weight", value: latestVitals?.weight, unit: "kg", icon: "âš–ï¸" },
        {
            label: "BMI",
            value: latestVitals?.bmi,
            unit: "",
            icon: "ðŸ“Š",
            extra: bmiCat.label ? (
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-current opacity-80 ${bmiCat.bg} ${bmiCat.color}`}>
                    {bmiCat.label}
                </span>
            ) : null
        },
    ];

    return (
        <div className="w-full xl:w-[320px] space-y-6 lg:sticky lg:top-8">
            {/* Vitals card â€” only shown when vitals exist */}
            {latestVitals && (
            <div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                <div className="space-y-4">
                    {vitalRows.filter((v) => v.value).map((v) => (
                        <div key={v.label} className="group/vital flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
                            <div className="flex items-center gap-3">
                                <span className="text-xl transition-transform group-hover/vital:scale-110">{v.icon}</span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{v.label}</span>
                                    {v.extra}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-black text-slate-700">{v.value}</span>
                                {v.unit && <span className="text-[9px] font-bold text-slate-400 ml-1">{v.unit}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}

            {/* Quick stats card */}

        </div>
    );
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MedicalRecordPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const startVisitFromLink = new URLSearchParams(location.search || "").get("start") === "1";

    // â”€â”€ Data layer â”€â”€
    const record = usePatientRecord(id);
    const {
        patient, visits, doctors, loading,
        latestVitals, latestVisitWithRx,
        reload,
        loadingChart,
        generatingPdf,
        fetchVisitById,
        deleteVisit,
        generateLatestMedicationPdf,
    } = record;

    // â”€â”€ Form layer â”€â”€
    const form = useMedicalForm({ patient, visits, doctors });

    // â”€â”€ View state â”€â”€
    const [viewMode, setViewMode] = useState(startVisitFromLink ? VIEW.NEW : VIEW.HISTORY);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showSticky, setShowSticky] = useState(false);
    const visitFormRef = useRef(null);

    // â”€â”€ Sticky Header Logic â”€â”€
    useEffect(() => {
        const handleScroll = () => {
            setShowSticky(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // â”€â”€ AI State â”€â”€
    const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const handleAiAssist = async () => {
        if (!form.visitData.symptoms?.trim()) {
            toast.error("Please enter symptoms first to guide the AI.");
            return;
        }
        setAiDrawerOpen(true);
        setAiLoading(true);
        try {
            const result = await generateVisitSuggestion({
                symptoms: form.visitData.symptoms,
                patient: patient,
                history: patient.medicalHistory
            });
            setAiSuggestion(result);
        } catch (error) {
            toast.error(error.message || "AI Assistance failed");
            setAiDrawerOpen(false);
        } finally {
            setAiLoading(false);
        }
    };


    // â”€â”€ Global Document Shortcuts â”€â”€
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                const submitBtn = document.getElementById("submit-clinical-record");
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);



    // â”€â”€ Template Usage Tracking â”€â”€
    const [recentTemplateIds, setRecentTemplateIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("clinicflow_recent_templates") || "[]");
        } catch { return []; }
    });

    // â”€â”€ Template Hiding logic â”€â”€
    const [hiddenTemplateIds, setHiddenTemplateIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("clinicflow_hidden_templates") || "[]");
        } catch { return []; }
    });

    const hideTemplate = useCallback((e, id) => {
        e.stopPropagation();
        setHiddenTemplateIds((prev) => {
            const next = [...new Set([...prev, id])];
            localStorage.setItem("clinicflow_hidden_templates", JSON.stringify(next));
            return next;
        });
        toast.success("Protocol hidden from toolbar");
    }, []);

    const restoreTemplates = () => {
        localStorage.removeItem("clinicflow_hidden_templates");
        setHiddenTemplateIds([]);
        toast.success("All clinical protocols restored");
    };

    const handleApplyTemplate = useCallback((protocol) => {

        form.applyTemplate(protocol);
        setRecentTemplateIds((prev) => {
            const next = [protocol.id, ...prev.filter(id => id !== protocol.id)].slice(0, 5);
            localStorage.setItem("clinicflow_recent_templates", JSON.stringify(next));
            return next;
        });
    }, [form]);

    // â”€â”€ Get filtered and sorted protocols â”€â”€
    const sortedProtocols = useMemo(() => {
        return [...CLINICAL_PROTOCOLS].sort((a, b) => {
            const indexA = recentTemplateIds.indexOf(a.id);
            const indexB = recentTemplateIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [recentTemplateIds]);

    const visibleProtocols = sortedProtocols.filter(p => !hiddenTemplateIds.includes(p.id));

    const isFormMode = viewMode === VIEW.NEW || viewMode === VIEW.EDIT;


    // â”€â”€ Safe navigation: prompt if form has unsaved data â”€â”€
    const safeSetViewMode = useCallback((target) => {
        if (isFormMode && target !== viewMode && form.formHasUnsavedData()) {
            if (!window.confirm("You have unsaved data. Leave without saving?")) return;
        }
        if (target === VIEW.HISTORY) {
            form.isEditingRef.current = false;
        }
        setViewMode(target);
    }, [isFormMode, viewMode, form]);

    // â”€â”€ Open full chart detail â”€â”€
    const openFullChart = useCallback(async (visitId) => {
        const v = await fetchVisitById(visitId);
        if (!v) return;
        setSelectedVisit(v);
        setViewMode(VIEW.CHART);
    }, [fetchVisitById]);

    // â”€â”€ Open visit for editing â”€â”€
    const openEditVisit = useCallback(async (visitId) => {
        const success = await form.loadVisitForEdit(visitId);
        if (success) setViewMode(VIEW.EDIT);
    }, [form]);

    // â”€â”€ Delete a visit â”€â”€
    const handleDeleteVisit = useCallback(async (visitId) => {
        await deleteVisit(visitId);
    }, [deleteVisit]);

    const handleForwardVisit = useCallback(async (visitId) => {
        safeSetViewMode(VIEW.NEW);
        await form.carryForward(visitId);
    }, [safeSetViewMode, form]);

    // â”€â”€ Generate prescription PDF â”€â”€
    const handleGeneratePdf = useCallback(async () => {
        const ok = await generateLatestMedicationPdf();
        if (ok && patient?.id) {
            recordFileOpen({
                id: `pdf-medication-${patient.id}-${Date.now()}`,
                title: "Medication & Administration",
                kind: "pdf",
                patientId: patient.id,
            });
        }
    }, [generateLatestMedicationPdf, patient]);

    // â”€â”€ Submit visit form (new or edit) â”€â”€
    const handleSubmitVisit = useCallback(async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const ok = await form.submitVisit({ patientId: id, viewMode, onSuccessReload: reload });
            if (ok) {
                recordVisitSessionComplete(id);
                setViewMode(VIEW.HISTORY);
            }
        } finally {
            setSubmitting(false);
        }
    }, [form, id, viewMode, reload]);

    useEffect(() => {
        if (patient?.id) {
            recordPatientOpen(patient);
        }
    }, [patient]);

    useEffect(() => {
        if (!patient?.id) return;
        if (viewMode === VIEW.NEW || viewMode === VIEW.EDIT) {
            recordVisitSessionStart({ patientId: patient.id, patientName: patient.name, patientPhone: patient.phone });
        }
    }, [patient, viewMode]);

    // â”€â”€â”€ Loading / not found states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (loading)
        return (
            <Layout>
                <div className="p-10 text-center animate-pulse font-bold text-slate-400">
                    Loading Clinical Sandbox...
                </div>
            </Layout>
        );
    if (!patient)
        return (
            <Layout>
                <div className="p-10 text-center text-red-500 font-bold">Patient record not found.</div>
            </Layout>
        );

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <Layout title={`${patient.name} - Clinical Record`}>


            {/* Sticky Top Header */}
            {!isFormMode && (
                <StickyPatientHeader
                    patient={patient}
                    latestVisitDate={visits[0]?.visitDate}
                    currentMeds={latestVisitWithRx?.prescriptions}
                    visible={showSticky}
                />
            )}

            <div className="mx-auto max-w-[1400px] space-y-8 pb-40 px-0 sm:px-4">

                {/* â”€â”€ Top Navigation Bar â”€â”€ */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/patients"
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> Patients Directory
                    </Link>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl sm:rounded-xl border border-slate-100 sm:border-slate-200 bg-white p-1.5 sm:p-1 shadow-sm">
                        <button
                            onClick={() => safeSetViewMode(VIEW.HISTORY)}
                            className={`rounded-lg px-4 py-2.5 sm:py-2 text-sm font-bold transition-all ${viewMode === VIEW.HISTORY
                                ? "text-slate-900 bg-slate-100"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            History Log
                        </button>
                        <button
                            onClick={() => safeSetViewMode(VIEW.NEW)}
                            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 sm:py-2 text-sm font-black transition-all ${viewMode === VIEW.NEW
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                }`}
                        >
                            <Plus className="w-4 h-4" /> Start Visit
                        </button>
                        {isFormMode && visits.length > 0 && (
                            <button
                                type="button"
                                onClick={form.carryForward}
                                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 sm:py-2 text-sm font-bold text-amber-600 transition-all hover:bg-amber-50"
                                title="Copy data from previous visit"
                            >
                                <ArrowLeft className="w-4 h-4 rotate-180" /> Carry Forward
                            </button>
                        )}
                    </div>
                </div>

                {/* â”€â”€ Clinical Templates Toolbar â”€â”€ */}
                {viewMode === VIEW.NEW && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clinical Protocols</span>
                                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/20">70% Faster</span>
                            </div>
                            {hiddenTemplateIds.length > 0 && (
                                <button
                                    onClick={restoreTemplates}
                                    className="text-[9px] font-black text-primary/40 uppercase hover:text-primary transition-colors"
                                >
                                    Restore All
                                </button>
                            )}
                        </div>
                        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 custom-scrollbar-hide -mx-2 px-2">
                            {visibleProtocols.map((protocol) => {
                                const isRecent = recentTemplateIds.includes(protocol.id);
                                return (
                                    <div key={protocol.id} className="group relative shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleApplyTemplate(protocol)}
                                            className={`flex flex-col items-center gap-4 rounded-2xl border bg-white p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/5 w-32 sm:w-40 ${isRecent ? "border-blue-400 ring-4 ring-blue-50 shadow-lg shadow-blue-500/10" : "border-blue-100/50 hover:border-blue-300"
                                                }`}
                                        >
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-50 bg-blue-50/30 text-3xl transition-all duration-500 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-500/20">
                                                {protocol.icon}
                                            </div>
                                            <div className="text-center">
                                                <span className="text-xs font-black text-slate-700 whitespace-nowrap block truncate w-32">{protocol.name}</span>
                                                {isRecent && (
                                                    <span className="mt-1 block text-[8px] font-black text-blue-500 uppercase tracking-[0.1em]">Recently Used</span>
                                                )}
                                            </div>
                                            <div className="absolute -right-1 -top-1 translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-emerald-500 p-1.5 text-white shadow-xl transition-all duration-300 group-hover/btn:scale-100">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                        </button>

                                        {/* Delete (Hide) Button */}
                                        <button
                                            onClick={(e) => hideTemplate(e, protocol.id)}
                                            className="absolute -left-2 -top-2 flex h-7 w-7 scale-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-300 shadow-lg transition-all duration-300 hover:bg-red-500 hover:text-white hover:border-red-500 group-hover:scale-100"
                                            title="Hide protocol"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Pro-tip for carry forward */}
                            {visits.length > 0 && (
                                <button
                                    type="button"
                                    onClick={form.carryForward}
                                    className="group flex shrink-0 flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-5 sm:p-6 transition-all hover:-translate-y-2 hover:border-amber-400 hover:bg-amber-50 w-32 sm:w-40"
                                >
                                    <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 transition-all group-hover:bg-amber-500 group-hover:text-white shadow-sm">
                                        <ArrowLeft className="h-6 w-6 rotate-180" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] sm:text-xs font-black text-amber-700 block">Repeat Visit</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                )}


                {/* â”€â”€ Two-column layout â”€â”€ */}
                <div className="flex flex-col xl:flex-row gap-8 items-start">

                    {/* â”€â”€ Main content â”€â”€ */}
                    <div className="flex-1 w-full space-y-8 min-w-0">

                        {/* Patient summary */}
                        {viewMode === VIEW.HISTORY && (
                            <PatientProfileCard
                                patient={patient}
                                generatingPrescription={generatingPdf}
                                onGeneratePdf={handleGeneratePdf}
                            />
                        )}

                        {/* Visit form (new or edit) */}
                        {isFormMode && (
                            <form ref={visitFormRef} onSubmit={handleSubmitVisit} className="space-y-8 animate-fade-in">
                                <EncounterDetailsSection
                                    visitData={form.visitData}
                                    setVisitData={form.setVisitData}
                                    doctors={doctors}
                                    viewMode={viewMode}
                                    onAiAssist={handleAiAssist}
                                    aiLoading={aiLoading}
                                />
                                <PatientBackgroundSection
                                    visitData={form.visitData}
                                    setVisitData={form.setVisitData}
                                />
                                <VitalsSection
                                    visitData={form.visitData}
                                    setVisitData={form.setVisitData}
                                />
                                <ExaminationSection
                                    visitData={form.visitData}
                                    setVisitData={form.setVisitData}
                                />
                                <LabImagingOrdersSection
                                    visitData={form.visitData}
                                    addLabOrderRow={form.addLabOrderRow}
                                    updateLabOrder={form.updateLabOrder}
                                    removeLabOrder={form.removeLabOrder}
                                    addImagingRow={form.addImagingRow}
                                    updateImaging={form.updateImaging}
                                    removeImaging={form.removeImaging}
                                    handleFileChange={form.handleFileChange}
                                />
                                <TestResultsSection
                                    visitData={form.visitData}
                                    addResultRow={form.addResultRow}
                                    updateResult={form.updateResult}
                                    removeResult={form.removeResult}
                                    handleResultFileChange={form.handleResultFileChange}
                                />
                                <DiagnosisRxSection
                                    visitData={form.visitData}
                                    addDiagnosisRow={form.addDiagnosisRow}
                                    updateDiagnosis={form.updateDiagnosis}
                                    removeDiagnosis={form.removeDiagnosis}
                                    addPrescriptionRow={form.addPrescriptionRow}
                                    updatePrescription={form.updatePrescription}
                                    removePrescription={form.removePrescription}
                                />
                                <VisitFormBottomBar
                                    submitting={submitting}
                                    viewMode={viewMode}
                                    onCancel={() => safeSetViewMode(VIEW.HISTORY)}
                                />
                            </form>
                        )}

                        {/* Visit history */}
                        {viewMode === VIEW.HISTORY && (
                            <VisitHistoryList
                                visits={visits}
                                loadingChart={record.loadingChart}
                                openFullChart={openFullChart}
                                openEditVisit={openEditVisit}
                                handleDeleteVisit={handleDeleteVisit}
                                onForwardVisit={handleForwardVisit}
                            />
                        )}

                        {/* Chart detail */}
                        {viewMode === VIEW.CHART && selectedVisit && (
                            <VisitChartDetail
                                selectedVisit={selectedVisit}
                                patient={patient}
                                onBack={() => setViewMode(VIEW.HISTORY)}
                            />
                        )}
                    </div>

                    {/* â”€â”€ Sidebar (hidden in form mode) â”€â”€ */}
                    {!isFormMode && (
                        <VitalsSidebar latestVitals={latestVitals} visits={visits} />
                    )}
                </div>
            </div>

            <AISuggestionDrawer
                isOpen={aiDrawerOpen}
                onClose={() => setAiDrawerOpen(false)}
                suggestion={aiSuggestion}
                isLoading={aiLoading}
                onApply={(decisionData) => {
                    form.applyAISuggestions(decisionData);
                    setAiDrawerOpen(false);
                }}
            />
        </Layout>
    );
};

export default MedicalRecordPage;

