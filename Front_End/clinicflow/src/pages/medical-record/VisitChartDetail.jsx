import React, { useState } from "react";
import { 
    Printer, 
    ArrowLeft, 
    Activity, 
    Stethoscope, 
    Pill, 
    Beaker, 
    FileText,
    Calendar,
    Clock,
    User,
    Shield,
    Smartphone,
    ClipboardList
} from "lucide-react";
import { getFileUrl } from "../../services/api";

/**
 * VisitChartDetail - High-fidelity in-page clinical encounter report.
 * Replaces the legacy simplified chart with the professional Royal Clinic design.
 */
const VisitChartDetail = ({ selectedVisit, patient, onBack }) => {
    const [viewMode, setViewMode] = useState("normal"); // 'compact' | 'normal'

    if (!selectedVisit) return null;

    const { 
        doctor, 
        vitals = {}, 
        prescriptions = [], 
        diagnoses = [], 
        labOrders = [], 
        imagingOrders = [], 
        results = [] 
    } = selectedVisit;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <button 
                        onClick={onBack}
                        className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-50 hover:text-blue-600 shadow-sm"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to History
                    </button>
                    <div className="hidden sm:block border-l border-slate-200 h-8 mx-2" />
                    <div className="hidden sm:block">
                        <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Encounter Preview</h1>
                        <p className="text-sm font-black text-slate-800">#{selectedVisit.encounterNumber || selectedVisit.id?.substring(0,8).toUpperCase()}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
                        <button 
                            onClick={() => setViewMode("compact")}
                            className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${viewMode === "compact" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            Compact
                        </button>
                        <button 
                            onClick={() => setViewMode("normal")}
                            className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${viewMode === "normal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            Normal
                        </button>
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex flex-1 md:flex-none justify-center items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95"
                    >
                        <Printer className="h-4 w-4" /> Print / Save
                    </button>
                </div>
            </div>

            {/* Report Container */}
            <div className={`overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0`}>
                
                {/* ── HEADER ───────────────────────────────────────────────────────── */}
                <div className="bg-[#0f766e] p-6 md:p-8 text-white min-w-0">
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
                        <div className="min-w-0 w-full">
                            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic break-words">ClinicFlow Medical Center</h2>
                            <div className="mt-2 text-xs font-bold text-emerald-50/80 leading-relaxed max-w-full break-words">
                                <p>Dr. {doctor?.name || "Attending Physician"} — {doctor?.specialty || "General Medicine"}</p>
                                <p>15 Nile St, Cairo — Tel: 02-XXXX-XXXX</p>
                            </div>
                        </div>
                        <div className="md:text-right flex flex-col md:items-end w-full md:w-auto gap-1">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-emerald-200/60 mb-2">
                                <div className="flex items-center gap-2 border-r border-emerald-500/30 pr-4">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{selectedVisit.visitDate ? new Date(selectedVisit.visitDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{selectedVisit.visitDate ? new Date(selectedVisit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-emerald-200">Visit: {selectedVisit.visitType || "Follow-up"}</p>
                            <p className="text-[10px] font-black text-emerald-200 mt-1">Encounter #{selectedVisit.encounterNumber || selectedVisit.id?.substring(0,8).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* ── PATIENT BIO ─────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 p-px sm:grid-cols-3 md:grid-cols-6">
                    <BioItem label="Patient Name" value={patient?.name} />
                    <BioItem label="Date of Birth" value={patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-GB") : "N/A"} />
                    <BioItem label="Gender" value={patient?.gender === 1 ? "Male" : patient?.gender === 2 ? "Female" : "N/A"} />
                    <BioItem label="ID / File No." value={patient?.id ? `PT-${patient.id.substring(0,5).toUpperCase()}` : "N/A"} />
                    <BioItem label="Phone" value={patient?.phoneNumber || "N/A"} icon={<Smartphone className="h-3 w-3" />} />
                    <BioItem label="Insurance" value={patient?.insuranceProvider || "BUPA Egypt"} icon={<Shield className="h-3 w-3" />} />
                </div>

                <div className={`${viewMode === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"}`}>
                    {/* ── COMPLAINT & BACKGROUND ──────────────────────────────────── */}
                    <div className={`${viewMode === "compact" ? "space-y-3" : "space-y-6"}`}>
                        <SectionHeader title="Chief Complaint & Background" icon={<FileText className="h-4 w-4" />} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className={`${viewMode === "compact" ? "space-y-2" : "space-y-4"}`}>
                                <SubSectionTitle title="Presenting Symptoms" />
                                <div className={`rounded-xl bg-slate-50 border border-slate-100 italic text-slate-700 leading-relaxed ${viewMode === "compact" ? "p-3 text-xs" : "p-4 text-sm"}`}>
                                    {selectedVisit.symptoms || "No clinical symptoms recorded for this visit."}
                                </div>
                            </div>
                            <div className={`${viewMode === "compact" ? "space-y-2" : "space-y-4"}`}>
                                <SubSectionTitle title="Drug History" />
                                <div className={`rounded-xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed font-bold ${viewMode === "compact" ? "p-3 text-xs" : "p-4 text-sm"}`}>
                                    {selectedVisit.drugHistory || "None reported."}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4">
                            <ClinicalPill label="Allergies" values={patient?.allergies?.split(",") || []} color="red" />
                            <ClinicalPill label="Chronic Diseases" values={patient?.chronicDiseases?.split(",") || []} color="amber" />
                        </div>
                    </div>

                    {/* ── TRIAGE & VITALS ─────────────────────────────────────────── */}
                    <div className={`${viewMode === "compact" ? "space-y-3" : "space-y-6"}`}>
                        <SectionHeader title="Triage & Vital Signs" icon={<Activity className="h-4 w-4" />} />
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-px bg-slate-100 border border-slate-200">
                            <VitalBox label="BP (mmHg)" val={vitals?.bloodPressure || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="HR (BPM)" val={vitals?.heartRate || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="Temp (°C)" val={vitals?.temperature || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="SpO2 (%)" val={vitals?.spo2 || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="RBS (mg/dL)" val={vitals?.rbs || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="Weight (kg)" val={vitals?.weight || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="Height (cm)" val={vitals?.height || "—"} compact={viewMode === "compact"} />
                            <VitalBox label="BMI" val={vitals?.bmi || "—"} compact={viewMode === "compact"} />
                        </div>
                    </div>

                    {/* ── PHYSICAL EXAMINATION ────────────────────────────────────── */}
                    <div className={`${viewMode === "compact" ? "space-y-3" : "space-y-6"}`}>
                        <SectionHeader title="Physical Examination" icon={<Stethoscope className="h-4 w-4" />} />
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${viewMode === "compact" ? "gap-2" : "gap-4"}`}>
                            <ExamBox label="General Findings" val={selectedVisit.generalExamination} compact={viewMode === "compact"} />
                            <ExamBox label="Cardiovascular" val={selectedVisit.cardiovascularSystem} compact={viewMode === "compact"} />
                            <ExamBox label="Respiratory" val={selectedVisit.respiratorySystem} compact={viewMode === "compact"} />
                            <ExamBox label="Gastrointestinal" val={selectedVisit.gastrointestinalSystem} compact={viewMode === "compact"} />
                            <ExamBox label="Nervous System" val={selectedVisit.nervousSystem} compact={viewMode === "compact"} />
                            <ExamBox label="Skin & Dermatology" val={selectedVisit.skinDermatology} compact={viewMode === "compact"} />
                        </div>
                        {selectedVisit.notes && (
                            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed">
                                <p className="font-black uppercase tracking-widest text-emerald-400 mb-2">Clinical Progress Notes</p>
                                {selectedVisit.notes}
                            </div>
                        )}
                    </div>

                    {/* ── INVESTIGATIONS ─────────────────────────────────────────── */}
                    {(labOrders?.length > 0 || imagingOrders?.length > 0) && (
                        <div className={`${viewMode === "compact" ? "space-y-3" : "space-y-6"}`}>
                            <SectionHeader title="Investigations & Diagnostics" icon={<Beaker className="h-4 w-4" />} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InvestigationTable title="Laboratory Orders" items={labOrders} />
                                <InvestigationTable title="Radiology / Imaging" items={imagingOrders} isImaging />
                            </div>
                        </div>
                    )}

                    {/* ── ASSESSMENT ───────────────────────────────────────────── */}
                    <div className="space-y-4">
                        <SectionHeader title="Assessment & Diagnosis" icon={<ClipboardList className="h-4 w-4" />} />
                        <div className="space-y-2">
                            {diagnoses?.length > 0 ? (
                                diagnoses.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-black text-emerald-600 font-mono tracking-tighter bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{d.icd10Code || "GEN-01"}</span>
                                            <span className="text-sm font-black text-slate-800">{d.description}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${i === 0 ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-200 text-slate-500"}`}>
                                            {i === 0 ? "Primary" : "Secondary"}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic">No formal diagnoses recorded for this encounter.</p>
                            )}
                        </div>
                    </div>

                    {/* ── PLAN ───────────────────────────────────────────────────── */}
                    {prescriptions?.length > 0 && (
                        <div className={`${viewMode === "compact" ? "space-y-3" : "space-y-6"}`}>
                            <SectionHeader title="Management & Treatment Plan" icon={<Pill className="h-4 w-4" />} />
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest">Medication</th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest">Dosage</th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest">Duration</th>
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest">Instructions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {prescriptions.map((p, i) => (
                                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                <td className="p-4 text-xs font-black text-slate-900">{p.medicationName}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{p.dosage}</td>
                                                <td className="p-4 text-xs font-bold text-slate-600">{p.duration}</td>
                                                <td className="p-4 text-[11px] text-slate-500 italic leading-relaxed">{p.instructions || "N/A"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── FINAL SIGNATURE ────────────────────────────────────────── */}
                    <div className="mt-20 flex items-end justify-between border-t-2 border-slate-900 pt-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 font-mono">Physician Digital Signature</p>
                            <h4 className="mt-6 text-xl font-black italic tracking-tighter text-slate-900 underline decoration-slate-200 decoration-4 underline-offset-8">
                                Dr. {doctor?.name || "Attending Physician"}
                            </h4>
                            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Clinical Encounter — {selectedVisit.id?.substring(0,10).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Powered by</p>
                            <h5 className="text-sm font-black italic tracking-tighter text-[#0f766e]">ClinicFlow SAAS</h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const BioItem = ({ label, value, icon }) => (
    <div className="bg-white p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <div className="flex items-center gap-2">
            {icon && <span className="text-slate-300">{icon}</span>}
            <p className="text-sm font-black text-slate-800 truncate">{value || "—"}</p>
        </div>
    </div>
);

const SectionHeader = ({ title, icon }) => (
    <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            {icon}
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h3>
    </div>
);

const SubSectionTitle = ({ title }) => (
    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</h4>
);

const ClinicalPill = ({ label, values, color }) => {
    if (!values?.length || (values.length === 1 && values[0] === "")) return null;
    const colorClasses = {
        red: "bg-red-50 text-red-600 border-red-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100"
    };
    return (
        <div className="flex flex-col gap-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">{label}</p>
            <div className="flex gap-2">
                {values.map((v, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${colorClasses[color]}`}>{v.trim()}</span>
                ))}
            </div>
        </div>
    );
};

const VitalBox = ({ label, val, compact }) => (
    <div className={`bg-white text-center transition-all hover:bg-slate-50 ${compact ? "p-2" : "p-3"}`}>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">{label}</p>
        <p className={`${compact ? "text-xs" : "text-sm"} font-black text-slate-900`}>{val}</p>
    </div>
);

const ExamBox = ({ label, val, compact }) => {
    if (!val) return null;
    return (
        <div className={`rounded-xl border border-slate-100 bg-slate-50/50 ${compact ? "p-3" : "p-4"}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
            <p className={`${compact ? "text-[10px]" : "text-xs"} text-slate-600 font-medium leading-relaxed`}>{val}</p>
        </div>
    );
};

const InvestigationTable = ({ title, items, isImaging }) => (
    <div className="space-y-3">
        <SubSectionTitle title={title} />
        <div className="divide-y divide-slate-100 border-t border-slate-100">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between py-2 text-xs">
                    <span className="font-black text-slate-700">{isImaging ? item.imagingType : item.testName}</span>
                    <span className="font-bold text-amber-600 uppercase tracking-tighter text-[10px]">Pending</span>
                </div>
            ))}
        </div>
    </div>
);

export default VisitChartDetail;