import React, { useMemo } from "react";
import { Plus, Trash2, CheckCircle2, Pill, AlertTriangle, ShieldAlert } from "lucide-react";
import ICDAutoComplete from "./ICDAutoComplete";
import MedicationAutoComplete from "./MedicationAutoComplete";
import { checkSafetyAlerts } from "./utils";

const SEVERITY_STYLES = {
    Critical: "bg-red-600/10 border-red-500 text-red-700 shadow-lg shadow-red-500/10",
    High:     "bg-orange-50 border-orange-300 text-orange-800 shadow-md shadow-orange-500/5",
    Medium:   "bg-amber-50 border-amber-200 text-amber-700",
    Low:      "bg-blue-50 border-blue-200 text-blue-700",
};
const SEVERITY_ICON_STYLES = {
    Critical: "bg-red-500 text-white animate-pulse",
    High:     "bg-orange-500 text-white",
    Medium:   "bg-amber-400 text-white",
    Low:      "bg-blue-400 text-white",
};

const DiagnosisRxSection = ({
    visitData,
    addDiagnosisRow, updateDiagnosis, removeDiagnosis,
    addPrescriptionRow, updatePrescription, removePrescription,
}) => {
    // ─── التحقق من التنبيهات الأمنية (تفاعلات، حساسية، تكرار) ───
    const safetyAlerts = useMemo(() => {
        return checkSafetyAlerts(visitData.prescriptions, visitData.allergies);
    }, [visitData.prescriptions, visitData.allergies]);


    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start relative">
            {/* Assessment/Diagnosis */}
            <div className="relative z-50 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-8 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-border/10">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-red-500" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                            Clinical Assessment
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={addDiagnosisRow}
                        className="group/btn relative flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:shadow-red-500/40 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        <Plus className="h-5 w-5 text-white" />
                    </button>
                </div>

                <div className="space-y-4 relative z-10">
                    {visitData.diagnoses.map((diag, index) => (
                        <div
                            key={index}
                            className="group/row flex flex-col items-stretch gap-4 rounded-xl border border-outline/60 bg-surface-alt/40 p-4 shadow-sm transition-all duration-300 hover:border-red-200 sm:flex-row sm:items-end sm:p-5"
                        >
                            <ICDAutoComplete
                                code={diag.icd10Code}
                                description={diag.description}
                                onChangeCode={(val) => updateDiagnosis(index, "icd10Code", val)}
                                onChangeDesc={(val) => updateDiagnosis(index, "description", val)}
                            />
                            <button
                                type="button"
                                onClick={() => removeDiagnosis(index)}
                                className="p-3.5 text-red-300 hover:text-white hover:bg-red-500 rounded-xl transition-all active:scale-90 sm:mb-0.5 opacity-100 sm:opacity-0 group-hover/row:opacity-100 flex items-center justify-center border border-outline/30 sm:border-0"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {visitData.diagnoses.length === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-outline/50">
                            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No diagnoses recorded</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Prescriptions */}
            <div className="relative z-40 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-8 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-border/10">
                    <div className="flex items-center gap-3">
                        <Pill className="h-5 w-5 text-primary" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                            Prescriptions & Plan
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={addPrescriptionRow}
                        className="group/btn relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        <Plus className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* ─── Clinical Safety Alerts ─── */}
                {safetyAlerts.length > 0 && (
                    <div className="relative z-50 mb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        {safetyAlerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.Medium}`}
                            >
                                <div className={`p-2 rounded-xl shrink-0 ${SEVERITY_ICON_STYLES[alert.severity] || SEVERITY_ICON_STYLES.Medium}`}>
                                    {alert.type === "Same Drug" ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest">{alert.type}</p>
                                        <div className="h-px flex-1 bg-current/10" />
                                        <p className="text-[8px] font-black uppercase tracking-tighter opacity-70">{alert.severity} Risk</p>
                                    </div>
                                    <p className="text-sm font-black leading-snug">{alert.message}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {alert.involved.map(drug => (
                                            <span key={drug} className="text-[10px] font-bold px-2 py-0.5 bg-white/50 rounded-full border border-current/20">
                                                {drug}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}


                <div className="space-y-6 relative z-10">
                    {visitData.prescriptions.map((rx, index) => {
                        const rxName = rx.medicationName?.toLowerCase().trim();
                        const isFlagged = rxName && safetyAlerts.some(a =>
                            a.involved?.some(drug => drug.toLowerCase() === rxName)
                        );
                        const flagAlert = isFlagged
                            ? safetyAlerts.find(a => a.involved?.some(drug => drug.toLowerCase() === rxName))
                            : null;

                        return (
                        <div
                            key={index}
                            className={`relative flex flex-col gap-5 rounded-xl border p-4 transition-all duration-300 group/rx sm:p-6 ${
                                flagAlert?.severity === "Critical"
                                    ? "border-red-400 bg-red-500/5 shadow-md shadow-red-500/10"
                                    : flagAlert?.severity === "High"
                                        ? "border-orange-300 bg-orange-50/50"
                                        : "border-outline/60 bg-surface-alt/40 hover:border-primary/30"
                            }`}
                        >
                            {isFlagged && (
                                <div className={`absolute -top-2 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md ${
                                    flagAlert?.severity === "Critical" ? "bg-red-500" : "bg-orange-400"
                                }`}>
                                    <AlertTriangle className="w-3 h-3" />
                                    {flagAlert?.type} — {flagAlert?.severity}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removePrescription(index)}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover/rx:opacity-100"
                            >

                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="md:col-span-2 lg:col-span-2">
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Medication Name
                                    </label>
                                    <MedicationAutoComplete
                                        value={rx.medicationName}
                                        onChange={(val) => updatePrescription(index, "medicationName", val)}
                                        placeholder="e.g. Amoxicillin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Dosage
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 500mg"
                                        value={rx.dosage}
                                        className="w-full p-3.5 border-0 !border-transparent rounded-xl bg-surface-alt text-on-surface text-sm font-bold outline-none focus:ring-0 focus:outline-none transition-all shadow-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 5 Days"
                                        value={rx.duration}
                                        className="w-full p-3.5 border-0 !border-transparent rounded-xl bg-surface-alt text-on-surface text-sm font-bold outline-none focus:ring-0 focus:outline-none transition-all shadow-none"
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Administration Instructions
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1 Tab 3x/day after food"
                                        value={rx.instructions}
                                        className="w-full p-3.5 border-0 !border-transparent rounded-xl bg-surface-alt text-on-surface text-sm font-bold outline-none focus:ring-0 focus:outline-none transition-all shadow-none"
                                    />
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    {visitData.prescriptions.length === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-outline/50">
                            <Pill className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No prescriptions recorded</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiagnosisRxSection;
