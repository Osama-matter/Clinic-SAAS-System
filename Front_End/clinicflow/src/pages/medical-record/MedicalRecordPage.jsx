import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ArrowLeft, Plus, Activity, FileDown } from "lucide-react";
import { recordFileOpen, recordPatientOpen, recordVisitSessionComplete, recordVisitSessionStart } from "../../lib/doctorActivity";

// ─── Local imports ────────────────────────────────────────────────────────────
import { usePatientRecord }  from "./usePatientRecord";
import { useMedicalForm }    from "./useMedicalForm";
import { sortVisitsByDate } from "./medicalUtils";

import EncounterDetailsSection   from "./EncounterDetailsSection";
import PatientBackgroundSection  from "./PatientBackgroundSection";
import VitalsSection             from "./VitalsSection";
import ExaminationSection        from "./ExaminationSection";
import LabImagingOrdersSection   from "./LabImagingOrdersSection";
import TestResultsSection        from "./TestResultsSection";
import DiagnosisRxSection        from "./DiagnosisRxSection";
import VisitFormBottomBar        from "./VisitFormBottomBar";
import VisitHistoryList          from "./VisitHistoryList";
import VisitChartDetail          from "./VisitChartDetail";

// ─── View modes ───────────────────────────────────────────────────────────────
const VIEW = { HISTORY: "history", NEW: "new-visit", EDIT: "edit-visit", CHART: "chart-detail" };

// ─── Patient profile sub-component ───────────────────────────────────────────
function PatientProfileCard({ patient, generatingPrescription, onGeneratePdf }) {
    const genderIcon = patient.gender === 1 ? "👨" : patient.gender === 2 ? "👩" : "👤";

    return (
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-outline bg-surface p-5 shadow-sm sm:gap-6 sm:p-8">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full" />

            <div className="relative z-10 min-w-0 flex-1">
                {/* Name row */}
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <h1 className="min-w-0 flex-1 text-2xl font-black text-on-surface sm:text-4xl">
                        <span className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner align-middle sm:h-12 sm:w-12">
                            {genderIcon}
                        </span>
                        <span className="inline-block max-w-full break-words align-middle">{patient.name}</span>
                    </h1>
                    <button
                        type="button"
                        onClick={onGeneratePdf}
                        disabled={generatingPrescription}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/35 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        <FileDown className="h-4 w-4" />
                        {generatingPrescription ? "Generating..." : "Generate Medication & Administration"}
                    </button>
                </div>

                {/* Demographics */}
                <div className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant sm:flex-row sm:flex-wrap sm:gap-6">
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        {patient.phone}
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </span>
                </div>

                {/* Clinical flags */}
                {(patient.allergies || patient.chronicDiseases || patient.drugHistory) && (
                    <div className="mt-5 flex flex-wrap gap-3">
                        {patient.allergies && (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Allergies: {patient.allergies}
                            </span>
                        )}
                        {patient.chronicDiseases && (
                            <span className="bg-orange-500/10 border border-orange-500/20 text-orange-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                Chronic: {patient.chronicDiseases}
                            </span>
                        )}
                        {patient.drugHistory && (
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                Drugs: {patient.drugHistory}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Vitals sidebar sub-component ────────────────────────────────────────────
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
        { label: "BP", value: latestVitals?.bloodPressure, unit: "mmHg", icon: "🩸" },
        { label: "HR", value: latestVitals?.heartRate, unit: "BPM", icon: "💓" },
        { label: "Temp", value: latestVitals?.temperature, unit: "°C", icon: "🌡️" },
        { label: "Weight", value: latestVitals?.weight, unit: "kg", icon: "⚖️" },
        { 
            label: "BMI", 
            value: latestVitals?.bmi, 
            unit: "", 
            icon: "📊",
            extra: bmiCat.label ? (
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-current opacity-80 ${bmiCat.bg} ${bmiCat.color}`}>
                    {bmiCat.label}
                </span>
            ) : null
        },
    ];

    return (
        <div className="w-full xl:w-[320px] space-y-6 sticky top-8">
            {/* Vitals card */}
            <div className="bg-white border border-outline rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" /> Current Vitals
                </h3>
                {latestVitals ? (
                    <div className="space-y-4">
                        {vitalRows.filter((v) => v.value).map((v) => (
                            <div key={v.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{v.icon}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{v.label}</span>
                                        {v.extra}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-on-surface">{v.value}</span>
                                    {v.unit && <span className="text-[9px] font-bold text-slate-400 ml-1">{v.unit}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-xs font-bold text-slate-300">No vitals on record</p>
                    </div>
                )}
            </div>

            {/* Quick stats card */}
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-80">Quick Stats</h3>
                <div className="space-y-4 relative z-10">
                    <div>
                        <p className="text-2xl font-black">{visits.length}</p>
                        <p className="text-[10px] font-bold uppercase opacity-70 tracking-wider">Total Encounters</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                        <p className="text-lg font-black">{lastVisitDate}</p>
                        <p className="text-[10px] font-bold uppercase opacity-70 tracking-wider">Last Visit</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const MedicalRecordPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const startVisitFromLink = new URLSearchParams(location.search || "").get("start") === "1";

    // ── Data layer ──
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

    // ── Form layer ──
    const form = useMedicalForm({ patient, visits, doctors });

    // ── View state ──
    const [viewMode, setViewMode]       = useState(startVisitFromLink ? VIEW.NEW : VIEW.HISTORY);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [submitting, setSubmitting]   = useState(false);

    const isFormMode = viewMode === VIEW.NEW || viewMode === VIEW.EDIT;

    // ── Safe navigation: prompt if form has unsaved data ──
    const safeSetViewMode = useCallback((target) => {
        if (isFormMode && target !== viewMode && form.formHasUnsavedData()) {
            if (!window.confirm("You have unsaved data. Leave without saving?")) return;
        }
        if (target === VIEW.HISTORY) {
            form.isEditingRef.current = false;
        }
        setViewMode(target);
    }, [isFormMode, viewMode, form]);

    // ── Open full chart detail ──
    const openFullChart = useCallback(async (visitId) => {
        const v = await fetchVisitById(visitId);
        if (!v) return;
        setSelectedVisit(v);
        setViewMode(VIEW.CHART);
    }, [fetchVisitById]);

    // ── Open visit for editing ──
    const openEditVisit = useCallback(async (visitId) => {
        const success = await form.loadVisitForEdit(visitId);
        if (success) setViewMode(VIEW.EDIT);
    }, [form]);

    // ── Delete a visit ──
    const handleDeleteVisit = useCallback(async (visitId) => {
        if (!window.confirm("Are you sure you want to permanently delete this comprehensive medical record?")) return;
        await deleteVisit(visitId);
    }, [deleteVisit]);

    // ── Generate prescription PDF ──
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

    // ── Submit visit form (new or edit) ──
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

    // ─── Loading / not found states ──────────────────────────────────────────
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

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <Layout title={`${patient.name} - Clinical Record`}>
            <div className="mx-auto max-w-[1400px] space-y-8 pb-40 px-4">

                {/* ── Top Navigation Bar ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/patients"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface px-4 py-2 text-center font-bold text-slate-400 transition-colors hover:text-primary hover:shadow-sm sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4" /> Patients Directory
                    </Link>

                    <div className="flex w-full overflow-hidden rounded-xl border border-outline bg-surface p-1 shadow-sm sm:w-auto">
                        <button
                            onClick={() => safeSetViewMode(VIEW.HISTORY)}
                            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:px-6 ${
                                viewMode === VIEW.HISTORY
                                    ? "bg-primary text-white shadow-md"
                                    : "text-on-surface-variant hover:bg-surface-alt"
                            }`}
                        >
                            History Log
                        </button>
                        <button
                            onClick={() => safeSetViewMode(VIEW.NEW)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:px-6 ${
                                viewMode === VIEW.NEW
                                    ? "bg-emerald-500 text-white shadow-md"
                                    : "text-emerald-500 hover:bg-emerald-500/10"
                            }`}
                        >
                            <Plus className="w-4 h-4" /> Start Visit
                        </button>
                        {isFormMode && visits.length > 0 && (
                            <button
                                type="button"
                                onClick={form.carryForward}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-amber-600 transition-all hover:bg-amber-50 sm:flex-none sm:px-6"
                                title="Copy data from previous visit"
                            >
                                <ArrowLeft className="w-4 h-4 rotate-180" /> Carry Forward
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Two-column layout ── */}
                <div className="flex flex-col xl:flex-row gap-8 items-start">

                    {/* ── Main content ── */}
                    <div className="flex-1 w-full space-y-8">

                        {/* Patient summary */}
                        <PatientProfileCard
                            patient={patient}
                            generatingPrescription={generatingPdf}
                            onGeneratePdf={handleGeneratePdf}
                        />

                        {/* Visit form (new or edit) */}
                        {isFormMode && (
                            <form onSubmit={handleSubmitVisit} className="space-y-8 animate-fade-in">
                                <EncounterDetailsSection
                                    visitData={form.visitData}
                                    setVisitData={form.setVisitData}
                                    doctors={doctors}
                                    viewMode={viewMode}
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
                            />
                        )}

                        {/* Chart detail */}
                        {viewMode === VIEW.CHART && selectedVisit && (
                            <VisitChartDetail
                                selectedVisit={selectedVisit}
                                onBack={() => setViewMode(VIEW.HISTORY)}
                            />
                        )}
                    </div>

                    {/* ── Sidebar (hidden in form mode) ── */}
                    {!isFormMode && (
                        <VitalsSidebar latestVitals={latestVitals} visits={visits} />
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MedicalRecordPage;
